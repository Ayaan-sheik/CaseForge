-- ============================================================
-- CaseForge — Supabase Schema
-- Paste this into the Supabase SQL Editor and run it.
-- ============================================================

-- PROFILES (extends Supabase auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  company_name text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can read/write own profile"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================

-- CAMPAIGNS
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id) on delete cascade,
  client_name text not null,
  service_provided text not null,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'recording', 'processing', 'complete', 'error')),
  magic_token uuid unique default gen_random_uuid(),
  questions jsonb,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table campaigns enable row level security;

-- Creators can do anything with their own campaigns
create policy "Creators manage own campaigns"
  on campaigns for all
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

-- Public (unauthenticated) can read campaigns by token (for interview flow)
create policy "Public can read campaigns"
  on campaigns for select
  using (true);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger campaigns_updated_at
  before update on campaigns
  for each row execute procedure update_updated_at();

-- ============================================================

-- RESPONSES (one row per question per campaign)
create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  question_id text not null,
  audio_url text,
  transcript_raw text,
  transcript_clean text,
  assemblyai_id text,
  duration_seconds integer,
  created_at timestamptz default now(),
  unique (campaign_id, question_id)
);
alter table responses enable row level security;

-- Creators can read responses for their own campaigns
create policy "Creators read own responses"
  on responses for select
  using (
    exists (
      select 1 from campaigns
      where campaigns.id = responses.campaign_id
        and campaigns.creator_id = auth.uid()
    )
  );

-- Public (respondents) can insert responses (for recording flow)
create policy "Public can insert responses"
  on responses for insert
  with check (true);

-- Service role can do anything (needed for webhook updates)
-- Note: service role bypasses RLS automatically when using service_role key

-- ============================================================

-- OUTPUTS (one row per campaign, generated after synthesis)
create table if not exists outputs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid unique not null references campaigns(id) on delete cascade,
  case_study_title text,
  case_study_summary text,
  case_study_challenge text,
  case_study_solution text,
  case_study_results text,
  testimonial_quote text,
  linkedin_quotes jsonb,
  pdf_url text,
  web_slug text unique,
  created_at timestamptz default now()
);
alter table outputs enable row level security;

-- Creators can read outputs for their own campaigns
create policy "Creators read own outputs"
  on outputs for select
  using (
    exists (
      select 1 from campaigns
      where campaigns.id = outputs.campaign_id
        and campaigns.creator_id = auth.uid()
    )
  );

-- Public can read outputs by slug (for hosted case study pages)
create policy "Public can read outputs"
  on outputs for select
  using (true);

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index if not exists campaigns_creator_id_idx on campaigns(creator_id);
create index if not exists campaigns_magic_token_idx on campaigns(magic_token);
create index if not exists campaigns_status_idx on campaigns(status);
create index if not exists responses_campaign_id_idx on responses(campaign_id);
create index if not exists responses_assemblyai_id_idx on responses(assemblyai_id);
create index if not exists outputs_web_slug_idx on outputs(web_slug);
create index if not exists outputs_campaign_id_idx on outputs(campaign_id);
