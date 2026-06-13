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
    campaigns?.filter((c) => ['sent', 'recording', 'processing'].includes(c.status)).length ?? 0;
  const complete = campaigns?.filter((c) => c.status === 'complete').length ?? 0;

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Campaigns</p>
          <h1 className="mt-4 font-display text-[clamp(28px,3vw,36px)] font-semibold leading-tight tracking-[-0.025em]">
            {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
          </h1>
          <p className="mt-1.5 font-editorial italic text-[15px] text-ink-secondary">
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

      {/* Stats */}
      {total > 0 && (
        <div className="mt-10 grid grid-cols-3 gap-4 border-t border-line pt-8">
          {[
            { value: total, label: 'Total campaigns' },
            { value: inFlight, label: 'In flight' },
            { value: complete, label: 'Published' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <CountUp
                value={stat.value}
                className="font-display text-[46px] font-semibold leading-none tracking-[-0.03em]"
              />
              <p className="mt-1.5 text-[15px] text-ink-secondary">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Campaign list */}
      {campaigns && campaigns.length > 0 ? (
        <div className="mt-10 space-y-3 border-t border-line pt-8">
          <p className="eyebrow mb-6">All campaigns</p>
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
        <div className="animate-scale-in mt-10 flex flex-col items-center rounded-[20px] border border-dashed border-line bg-white px-6 py-20 text-center">
          <div className="flex h-16 items-end gap-1" aria-hidden="true">
            {WAVE_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className="wave-bar w-1.5 rounded-full bg-ink/60"
                style={{ height: `${h + 8}px`, animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
          <h2 className="mt-8 font-display text-[22px] font-semibold tracking-tight">
            No campaigns yet
          </h2>
          <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-ink-secondary">
            Send a magic link to a client and their voice comes back as a finished case study — PDF,
            public page, and LinkedIn quotes included.
          </p>
          <Link href="/campaigns/new" className="mt-8">
            <Button size="lg">Create your first campaign</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
