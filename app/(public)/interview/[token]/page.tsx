import Link from 'next/link';
import { Mic, Smartphone, Timer } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { MarkOpened } from '@/components/interview/MarkOpened';

export default async function InterviewLandingPage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, client_name, service_provided, status, creator_id')
    .eq('magic_token', params.token)
    .maybeSingle();

  if (!campaign || campaign.status === 'complete') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm text-center">
          <p className="text-4xl">🔗</p>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">
            This link isn&apos;t active anymore
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            It may have expired or already been completed. Please reach out to
            the person who sent it to you for a fresh link.
          </p>
        </div>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_name, full_name')
    .eq('id', campaign.creator_id)
    .maybeSingle();

  const creatorCompany =
    profile?.company_name || profile?.full_name || 'your partner';

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <MarkOpened token={params.token} />
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          CaseForge
        </p>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Hi {campaign.client_name}! 👋
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          You&apos;ve been asked to share your experience working with{' '}
          <strong>{creatorCompany}</strong>.
        </p>

        <div className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm">
          <div className="flex items-start gap-3">
            <Timer className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
            <p className="text-sm text-slate-600">
              This takes about <strong>90 seconds</strong>. You&apos;ll answer
              3 quick questions using your voice — no typing needed.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
            <p className="text-sm text-slate-600">
              No app to download. Works right in your browser.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Mic className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
            <p className="text-sm text-slate-600">
              Just hold the button, talk naturally, and release when
              you&apos;re done.
            </p>
          </div>
        </div>

        <Link href={`/interview/${params.token}/record`} className="mt-8 block">
          <Button size="lg" className="w-full">
            Start Recording →
          </Button>
        </Link>
      </div>
    </main>
  );
}
