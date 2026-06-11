import Link from 'next/link';
import { ArrowRight, Mic, Smartphone, Timer } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/ui/logo';
import { MarkOpened } from '@/components/interview/MarkOpened';

const DETAILS = [
  {
    icon: Timer,
    title: 'About 90 seconds',
    body: 'Three quick questions, answered with your voice. No typing.',
  },
  {
    icon: Smartphone,
    title: 'Nothing to install',
    body: 'Works right here in your browser, on any phone or laptop.',
  },
  {
    icon: Mic,
    title: 'Just talk naturally',
    body: 'Hold the button, say it like you’d say it to a colleague, release.',
  },
];

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
      <main className="flex min-h-screen items-center justify-center bg-paper p-6">
        <div className="animate-fade-up max-w-sm text-center">
          <LogoMark className="mx-auto h-10 w-10 rounded-xl" />
          <h1 className="mt-6 font-display text-xl font-semibold text-ink">
            This link isn&apos;t active anymore
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
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
    <main className="flex min-h-screen items-center justify-center bg-paper p-6">
      <MarkOpened token={params.token} />
      <div className="w-full max-w-md">
        <div className="animate-fade-up text-center">
          <LogoMark className="mx-auto h-10 w-10 rounded-xl" animated />
          <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-ink-muted">
            A request from {creatorCompany}
          </p>
          <h1 className="mt-4 text-balance font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Hi {campaign.client_name} —{' '}
            <span className="font-editorial italic text-accent">
              tell it in your own words.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-[46ch] text-pretty text-base leading-relaxed text-ink-secondary">
            {creatorCompany} would love to capture your experience working
            together. You talk, we&apos;ll do all the writing.
          </p>
        </div>

        <div
          className="animate-fade-up mt-9 space-y-3"
          style={{ animationDelay: '150ms' }}
        >
          {DETAILS.map((item, i) => (
            <div
              key={item.title}
              className="animate-fade-up flex items-start gap-4 rounded-[20px] border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(25_21_16/0.03)]"
              style={{ animationDelay: `${200 + i * 110}ms` }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft">
                <item.icon className="h-4 w-4 text-accent" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{item.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-secondary">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          className="animate-fade-up mt-8"
          style={{ animationDelay: '560ms' }}
        >
          <Link href={`/interview/${params.token}/record`} className="block">
            <Button size="lg" className="w-full">
              Start recording
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            Powered by CaseForge
          </p>
        </div>
      </div>
    </main>
  );
}
