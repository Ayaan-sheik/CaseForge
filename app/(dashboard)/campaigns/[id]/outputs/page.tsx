import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { OutputTabs } from '@/components/outputs/OutputTabs';
import type { Campaign, Output } from '@/lib/types';

export default async function OutputsPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', params.id)
    .maybeSingle<Campaign>();

  if (!campaign) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (campaign.creator_id !== user?.id) notFound();

  const { data: output } = await supabase
    .from('outputs')
    .select('*')
    .eq('campaign_id', params.id)
    .maybeSingle<Output>();

  if (!output) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto flex h-10 items-center justify-center gap-1.5" aria-hidden="true">
          {[14, 26, 18, 32, 22].map((h, i) => (
            <span
              key={i}
              className="wave-bar w-1 rounded-full bg-ink/60"
              style={{ height: `${h}px`, animationDelay: `${i * 0.14}s` }}
            />
          ))}
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent-soft px-4 py-2">
          <span className="pulse-dot" />
          <span className="font-mono text-[12px] uppercase tracking-[0.12em] text-accent">Generating</span>
        </div>
        <h1 className="mt-6 font-display text-[22px] font-semibold text-ink">
          Outputs aren&apos;t ready yet
        </h1>
        <p className="mt-2 text-[15px] text-ink-secondary">
          We&apos;re still writing this one. Check back in a minute or two.
        </p>
        <Link
          href={`/campaigns/${params.id}`}
          className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-ink underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaign
        </Link>
      </div>
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <Link
          href={`/campaigns/${params.id}`}
          className="inline-flex items-center gap-1.5 text-[14px] text-ink-secondary transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaign
        </Link>
        <div className="mt-6">
          <p className="eyebrow">Outputs · {campaign.client_name}</p>
          <h1 className="mt-4 max-w-2xl font-display text-[clamp(24px,3vw,32px)] font-semibold leading-tight tracking-[-0.025em]">
            {output.case_study?.headline_result || campaign.client_name}
          </h1>
        </div>
        {/* Asset status chips */}
        <div className="mt-5 flex flex-wrap gap-2">
          {[
            `${campaign.client_name.toLowerCase().replace(/\s+/g, '-')}-case-study.pdf`,
            `caseforge.page/${campaign.client_name.toLowerCase().replace(/\s+/g, '-')}`,
            'Quote cards',
          ].map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 font-mono text-[11.5px] text-ink-secondary"
            >
              <span className="font-medium text-success">✓</span>
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
        <OutputTabs output={output} appUrl={appUrl} clientName={campaign.client_name} />
      </div>
    </div>
  );
}
