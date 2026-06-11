import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { CountUp } from '@/components/ui/count-up';
import { CampaignCard } from '@/components/dashboard/CampaignCard';
import type { Campaign } from '@/lib/types';

const WAVE_HEIGHTS = [10, 22, 34, 26, 40, 30, 18, 36, 24, 14];

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: campaigns }, { data: profile }] = await Promise.all([
    supabase
      .from('campaigns')
      .select('*')
      .eq('creator_id', user!.id)
      .order('created_at', { ascending: false })
      .returns<Campaign[]>(),
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user!.id)
      .maybeSingle<{ full_name: string | null }>(),
  ]);

  const firstName = profile?.full_name?.split(' ')[0];
  const total = campaigns?.length ?? 0;
  const inFlight =
    campaigns?.filter((c) =>
      ['sent', 'recording', 'processing'].includes(c.status)
    ).length ?? 0;
  const complete =
    campaigns?.filter((c) => c.status === 'complete').length ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-muted">
            Campaigns
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
          </h1>
          <p className="mt-1.5 font-editorial text-base italic text-ink-muted">
            {total
              ? 'Every link you send is a story waiting to come back.'
              : 'Your first story is one link away.'}
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="h-4 w-4" />
            New campaign
          </Button>
        </Link>
      </div>

      {total > 0 && (
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { value: total, label: 'campaigns' },
            { value: inFlight, label: 'in flight' },
            { value: complete, label: 'published' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="animate-fade-up rounded-[20px] border border-line bg-surface p-5 sm:p-6"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <CountUp
                value={stat.value}
                className="font-display text-4xl font-semibold tracking-tight sm:text-5xl"
              />
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {campaigns && campaigns.length > 0 ? (
        <div className="mt-6 space-y-3">
          {campaigns.map((campaign, i) => (
            <div
              key={campaign.id}
              className="animate-fade-up"
              style={{ animationDelay: `${200 + Math.min(i * 70, 480)}ms` }}
            >
              <CampaignCard campaign={campaign} />
            </div>
          ))}
        </div>
      ) : (
        <div className="animate-scale-in mt-10 flex flex-col items-center rounded-[28px] border border-dashed border-line bg-surface px-6 py-20 text-center">
          <div className="flex h-16 items-end gap-1" aria-hidden="true">
            {WAVE_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className="wave-bar w-1.5 rounded-full bg-ink/80"
                style={{
                  height: `${h + 8}px`,
                  animationDelay: `${i * 0.12}s`,
                }}
              />
            ))}
          </div>
          <h2 className="mt-8 font-display text-xl font-semibold tracking-tight">
            No campaigns yet
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-secondary">
            Send a magic link to a client and their voice comes back as a
            finished case study — PDF, public page, and LinkedIn quotes
            included.
          </p>
          <Link href="/campaigns/new" className="mt-8">
            <Button size="lg">Create your first campaign</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
