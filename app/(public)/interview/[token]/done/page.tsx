import { createAdminClient } from '@/lib/supabase/server';

export default async function InterviewDonePage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('client_name, creator_id')
    .eq('magic_token', params.token)
    .maybeSingle();

  let creatorName = 'They';
  if (campaign) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name, full_name')
      .eq('id', campaign.creator_id)
      .maybeSingle();
    creatorName = profile?.full_name || profile?.company_name || 'They';
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md text-center">
        <p className="text-5xl">🎉</p>
        <h1 className="mt-6 text-3xl font-bold text-slate-900">
          Thank you{campaign ? `, ${campaign.client_name}` : ''}!
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Your answers have been submitted. {creatorName} will have their case
          study shortly.
        </p>
        <p className="mt-8 text-xs text-slate-400">Powered by CaseForge</p>
      </div>
    </main>
  );
}
