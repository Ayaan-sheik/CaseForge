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
        <h1 className="text-xl font-semibold text-slate-900">
          Outputs aren&apos;t ready yet
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          We&apos;re still processing this campaign. Check back in a minute or
          two.
        </p>
        <Link
          href={`/campaigns/${params.id}`}
          className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to campaign
        </Link>
      </div>
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/campaigns/${params.id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaign
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {campaign.client_name} — Outputs
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {output.case_study_title}
        </p>
      </div>

      <OutputTabs campaignId={campaign.id} output={output} appUrl={appUrl} />
    </div>
  );
}
