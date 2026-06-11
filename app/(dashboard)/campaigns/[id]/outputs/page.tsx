import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { OutputTabs } from '@/components/outputs/OutputTabs';
import type { Campaign, Output } from '@/lib/types';

export default async function OutputsPage({
  params,
}: {
  params: { id: string };
}) {
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
        <h1 className="mt-6 font-display text-xl font-semibold text-ink">
          Outputs aren&apos;t ready yet
        </h1>
        <p className="mt-2 text-sm text-ink-secondary">
          We&apos;re still writing this one. Check back in a minute or two.
        </p>
        <Link
          href={`/campaigns/${params.id}`}
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-ink underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaign
        </Link>
      </div>
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <Link
          href={`/campaigns/${params.id}`}
          className="inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaign
        </Link>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-ink-muted">
          Outputs · {campaign.client_name}
        </p>
        <h1 className="mt-2 max-w-2xl text-balance font-display text-3xl font-semibold tracking-tight text-ink">
          {output.case_study_title}
        </h1>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
        <OutputTabs campaignId={campaign.id} output={output} appUrl={appUrl} />
      </div>
    </div>
  );
}
