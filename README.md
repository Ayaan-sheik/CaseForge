# CaseForge

> Async audio case studies — no Zoom calls required.

CaseForge lets B2B founders and consultants send a magic link to their clients. The client records 90-second voice answers to 3 AI-generated questions. CaseForge auto-generates a PDF case study, a hosted web page, and LinkedIn quote snippets.

---

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** — Postgres database + Auth
- **Vercel Blob** — audio file and PDF storage
- **AssemblyAI** — audio transcription
- **Anthropic Claude** — question generation + synthesis
- **Resend** — transactional email
- **Tailwind CSS + shadcn/ui** — styling

---

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd caseforge
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`. See `.env.example` for where to find each key.

### 3. Supabase setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste the contents of `schema.sql`
3. Run the SQL — this creates all tables, policies, triggers, and indexes
4. Copy your project URL, anon key, and service role key into `.env.local`

### 4. Vercel Blob setup

Option A (recommended): Deploy to Vercel first, then create a Blob store in the Vercel dashboard and link it to your project. The `BLOB_READ_WRITE_TOKEN` will be auto-injected.

Option B (local dev): Create a Blob store via Vercel CLI:
```bash
npx vercel link
npx vercel env pull
```

### 5. Run locally

```bash
npm run dev
```

App runs at `http://localhost:3000`

---

## Webhook Setup (AssemblyAI)

AssemblyAI needs to POST transcription results to your server. In local development, expose your localhost:

```bash
# Option 1: localtunnel
npx localtunnel --port 3000

# Option 2: ngrok
ngrok http 3000
```

Update `NEXT_PUBLIC_APP_URL` in `.env.local` to the tunnel URL (e.g. `https://abc123.loca.lt`).

In production on Vercel, the webhook URL is automatically `https://your-app.vercel.app/api/webhooks/assemblyai`.

---

## Project Structure

```
app/
  (auth)/          — Login + Signup pages
  (dashboard)/     — Protected creator dashboard + campaign management
  (public)/        — Interview recording UI + hosted case study pages
  api/             — All API routes

components/
  dashboard/       — Campaign cards, status badges
  interview/       — Recording button, waveform, question display
  outputs/         — PDF viewer, LinkedIn quote cards
  pdf/             — @react-pdf/renderer template

lib/
  supabase/        — Client, server, and middleware helpers
  ai/              — Claude prompts (question gen + synthesis)
  assemblyai/      — Transcription submission + webhook processing
  email/           — Resend templates and send helpers
  pdf/             — PDF generation utility
  utils/           — Slug generation, formatting helpers
```

---

## Key User Flows

### Creator Flow
1. Sign up → Dashboard
2. "New Campaign" → Enter client name + service → AI generates 3 questions
3. Review/edit questions → Create campaign → Copy magic link
4. Send link to client via email or SMS
5. Receive email when client finishes → View outputs in dashboard
6. Download PDF, share web page, copy LinkedIn quotes

### Client (Respondent) Flow
1. Receive link, open in phone browser
2. See greeting screen → tap "Start Recording"
3. Hold button to answer Q1, release, submit → repeat for Q2, Q3
4. See thank-you screen — done in ~90 seconds

---

## Deployment

1. Push to GitHub
2. Import to Vercel
3. Add all environment variables in Vercel project settings
4. Create a Blob store in Vercel Storage and link to project
5. Deploy

Supabase handles the database — no additional infra needed.

---

## Roadmap (Post-MVP)

- [ ] Stripe billing / subscription enforcement
- [ ] Team workspaces (multiple users per account)
- [ ] Custom branding on case study pages
- [ ] CRM integrations (HubSpot, Salesforce)
- [ ] Video recording option
- [ ] Case study page analytics
- [ ] Multi-language support
- [ ] Client re-recording / editing
