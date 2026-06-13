import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { MagicLinkCard } from '@/components/dashboard/MagicLinkCard';
import { RetryProcessingButton } from '@/components/dashboard/RetryProcessingButton';
import { cn } from '@/lib/utils/cn';
import type { Campaign, Question } from '@/lib/types';

const TIMELINE_STEPS = [
  { label: 'Link sent', ts: '00:00' },
  { label: 'Interview started', ts: '00:10' },
  { label: 'Processing', ts: '00:30' },
  { label: 'Complete', ts: '05:00' },
];

const STATUS_PROGRESS: Record<string, number> = {
  draft: 0,
  sent: 1,
  recording: 2,
  processing: 3,
  complete: 4,
  error: 3,
};

export default async function CampaignPage({ params }: { params: { id: string } }) {
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const magicLink = `${appUrl}/interview/${campaign.magic_token}`;
  const questions: Question[] = campaign.questions ?? [];
  const progress = STATUS_PROGRESS[campaign.status] ?? 0;
  const inFlight = ['recording', 'processing'].includes(campaign.status);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[14px] text-ink-secondary transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <p className="eyebrow mt-4">Campaign</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[clamp(28px,3vw,36px)] font-semibold leading-tight tracking-[-0.025em]">
              {campaign.client_name}
            </h1>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="mt-1.5 text-[15px] text-ink-secondary">{campaign.service_provided}</p>
        </div>
        {campaign.status === 'complete' && (
          <Link href={`/campaigns/${campaign.id}/outputs`}>
            <Button>
              View outputs
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {/* Error state */}
      {campaign.status === 'error' && (
        <div className="animate-fade-up rounded-[18px] border border-accent/30 bg-accent-soft/60 p-6">
          <p className="font-medium text-ink">Something went wrong while generating this case study.</p>
          {campaign.error_message && (
            <p className="mt-1.5 text-[14px] text-accent">{campaign.error_message}</p>
          )}
          <div className="mt-4">
            <RetryProcessingButton campaignId={campaign.id} />
          </div>
        </div>
      )}

      {/* Processing state */}
      {campaign.status === 'processing' && (
        <div className="animate-fade-up rounded-[18px] border border-line bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rec-chip">
              <span className="pulse-dot" />
              <span>Generating</span>
            </div>
          </div>
          <p className="mt-3 text-[15px] text-ink-secondary">
            Generating the case study — this usually takes under a minute. Taking longer? You can safely retry — the recorded answers are already saved.
          </p>
          <div className="mt-4">
            <RetryProcessingButton campaignId={campaign.id} />
          </div>
        </div>
      )}

      {/* Complete success */}
      {campaign.status === 'complete' && (
        <div className="animate-fade-up rounded-[18px] border border-line bg-white p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-success/15">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  stroke="#4CC38A"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="draw-check"
                />
              </svg>
            </span>
            <p className="text-[15px] leading-relaxed text-ink-secondary">
              The interview is done and the case study is written. Head to{' '}
              <Link href={`/campaigns/${campaign.id}/outputs`} className="font-medium text-ink underline-offset-4 hover:underline">
                Outputs
              </Link>{' '}
              for the PDF, public page, and LinkedIn quotes.
            </p>
          </div>
        </div>
      )}

      {/* Tape-rail timeline */}
      {campaign.status !== 'complete' && (
        <div className="animate-fade-up rounded-[18px] border border-line bg-white p-6">
          <p className="eyebrow mb-6">Progress</p>
          <div className="tape-rail">
            {TIMELINE_STEPS.map((step, index) => {
              const done = index < progress;
              const isCurrent = index === progress && inFlight;
              return (
                <div
                  key={step.label}
                  className={cn(
                    'tape-step',
                    done || index === 3 && campaign.status === 'complete' ? 'done' : '',
                    isCurrent ? 'active' : ''
                  )}
                >
                  <p className="font-mono text-[12.5px] tracking-[0.08em] text-accent">{step.ts}</p>
                  <h3
                    className={cn(
                      'mt-2.5 font-display text-[17px] font-semibold leading-tight tracking-[-0.01em]',
                      !done && !isCurrent && 'text-ink-secondary'
                    )}
                  >
                    {step.label}
                  </h3>
                  {isCurrent && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-accent">
                      <span className="pulse-dot h-1.5 w-1.5" />
                      In progress
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Magic link */}
      <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
        <MagicLinkCard link={magicLink} />
      </div>

      {/* Questions */}
      <div
        className="animate-fade-up rounded-[18px] border border-line bg-white p-6"
        style={{ animationDelay: '220ms' }}
      >
        <p className="eyebrow mb-6">Interview questions</p>
        <ol className="space-y-5">
          {questions.map((question, index) => (
            <li key={question.id} className="flex gap-4">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-paper font-mono text-[12px] font-semibold text-ink-secondary">
                {index + 1}
              </span>
              <span className="text-[15px] leading-relaxed text-ink-secondary">{question.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
