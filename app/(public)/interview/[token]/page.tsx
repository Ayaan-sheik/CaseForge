import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { MarkOpened } from '@/components/interview/MarkOpened';

export default async function InterviewLandingPage({ params }: { params: { token: string } }) {
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, client_name, service_provided, status, creator_id')
    .eq('magic_token', params.token)
    .maybeSingle();

  if (!campaign || campaign.status === 'complete' || campaign.status === 'processing') {
    return (
      <main className="flex min-h-screen flex-col bg-paper px-7 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-[9px] font-display text-[19px] font-semibold tracking-[-0.02em] text-ink no-underline"
        >
          <span className="h-[10px] w-[10px] flex-shrink-0 rounded-full bg-accent" />
          CaseForge
        </Link>
        <div className="animate-fade-up mx-auto mt-20 max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-white">
            <span className="h-2 w-2 rounded-full bg-ink-secondary" />
          </div>
          <h1 className="font-display text-[22px] font-semibold text-ink">
            This link isn&apos;t active anymore
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-secondary">
            It may have expired or already been completed. Please reach out to the person who sent it
            for a fresh link.
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

  const creatorCompany = profile?.company_name || profile?.full_name || 'your partner';

  return (
    <main className="flex min-h-screen flex-col bg-paper px-7 py-10">
      <MarkOpened token={params.token} />

      {/* Wordmark */}
      <Link
        href="/"
        className="inline-flex items-center gap-[9px] font-display text-[19px] font-semibold tracking-[-0.02em] text-ink no-underline"
      >
        <span className="h-[10px] w-[10px] flex-shrink-0 rounded-full bg-accent" />
        CaseForge
      </Link>

      {/* Main card */}
      <div className="mx-auto mt-14 w-full max-w-md">
        <div className="animate-fade-up">
          <p className="eyebrow">A request from {creatorCompany}</p>
          <h1 className="mt-5 font-display text-[clamp(28px,4vw,36px)] font-semibold leading-tight tracking-[-0.025em]">
            Hi {campaign.client_name} —{' '}
            <em className="font-editorial font-medium not-italic italic text-accent">
              tell it in your own words.
            </em>
          </h1>
          <p className="mt-4 max-w-[46ch] text-[17px] leading-relaxed text-ink-secondary">
            {creatorCompany} would love to capture your experience working together. You talk, we&apos;ll
            do all the writing.
          </p>
        </div>

        {/* Detail chips — tape-rail style */}
        <div
          className="animate-fade-up mt-8 tape-rail"
          style={{ animationDelay: '150ms' }}
        >
          {[
            { ts: '0:00', title: 'About 5 minutes', body: 'Three questions, answered with your voice. No typing.' },
            { ts: '0:10', title: 'Nothing to install', body: 'Works right here in your browser — phone or laptop.' },
            { ts: '5:00', title: 'Just talk naturally', body: 'Hold record, say it like you\'d say it to a colleague, release.', last: true },
          ].map((item) => (
            <div key={item.title} className={`tape-step ${item.last ? 'active' : ''}`}>
              <p className="font-mono text-[12px] tracking-[0.08em] text-accent">{item.ts}</p>
              <h3 className="mt-2 font-display text-[17px] font-semibold leading-tight tracking-tight">
                {item.title}
              </h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-secondary">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="animate-fade-up mt-10" style={{ animationDelay: '450ms' }}>
          <Link href={`/interview/${params.token}/record`} className="block">
            <Button size="lg" className="w-full">
              Start recording
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="mt-5 text-center font-mono text-[11.5px] uppercase tracking-[0.12em] text-ink-secondary">
            Powered by CaseForge
          </p>
        </div>
      </div>
    </main>
  );
}
