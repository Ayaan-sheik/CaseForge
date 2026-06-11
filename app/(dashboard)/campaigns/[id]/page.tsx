import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { MagicLinkCard } from '@/components/dashboard/MagicLinkCard';
import { RetryProcessingButton } from '@/components/dashboard/RetryProcessingButton';
import { cn } from '@/lib/utils/cn';
import type { Campaign, Question } from '@/lib/types';

const TIMELINE_STEPS = [
  'Link sent',
  'Interview started',
  'Processing',
  'Complete',
];

// How many timeline steps each status has completed
const STATUS_PROGRESS: Record<string, number> = {
  draft: 0,
  sent: 1,
  recording: 2,
  processing: 3,
  complete: 4,
  error: 3,
};

export default async function CampaignPage({
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const magicLink = `${appUrl}/interview/${campaign.magic_token}`;
  const questions: Question[] = campaign.questions ?? [];
  const progress = STATUS_PROGRESS[campaign.status] ?? 0;
  const inFlight = ['recording', 'processing'].includes(campaign.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-muted">
            Campaign
          </p>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {campaign.client_name}
            </h1>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="mt-1.5 text-sm text-ink-secondary">
            {campaign.service_provided}
          </p>
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

      {campaign.status === 'error' && (
        <Card className="animate-fade-up border-accent/30 bg-accent-soft/60">
          <CardContent className="space-y-3 p-6">
            <p className="font-medium text-ink">
              Something went wrong while generating this case study.
            </p>
            {campaign.error_message && (
              <p className="text-sm text-accent">{campaign.error_message}</p>
            )}
            <RetryProcessingButton campaignId={campaign.id} />
          </CardContent>
        </Card>
      )}

      {campaign.status === 'complete' ? (
        <Card className="animate-fade-up">
          <CardContent className="flex items-center gap-4 p-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  stroke="#2E8B61"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="draw-check"
                />
              </svg>
            </span>
            <p className="text-sm leading-relaxed text-ink-secondary">
              The interview is done and the case study is written. Head to{' '}
              <Link
                href={`/campaigns/${campaign.id}/outputs`}
                className="font-medium text-ink underline-offset-4 hover:underline"
              >
                Outputs
              </Link>{' '}
              for the PDF, public page, and LinkedIn quotes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="animate-fade-up">
          <CardContent className="p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
              Progress
            </p>
            <ol className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-0">
              {TIMELINE_STEPS.map((label, index) => {
                const done = index < progress;
                const isCurrent = index === progress && inFlight;
                const isLast = index === TIMELINE_STEPS.length - 1;
                return (
                  <li
                    key={label}
                    className={cn(
                      'flex items-center gap-3',
                      !isLast && 'sm:flex-1'
                    )}
                  >
                    <div
                      className={cn(
                        'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-mono text-xs font-semibold transition-colors duration-500',
                        done
                          ? 'border-ink bg-ink text-paper'
                          : isCurrent
                            ? 'border-accent bg-accent-soft text-accent'
                            : 'border-line bg-surface text-ink-muted'
                      )}
                    >
                      {isCurrent && (
                        <span className="animate-ring absolute inset-0 rounded-full bg-accent/40" />
                      )}
                      {done ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                    <span
                      className={cn(
                        'text-sm',
                        done
                          ? 'font-medium text-ink'
                          : isCurrent
                            ? 'font-medium text-accent'
                            : 'text-ink-muted'
                      )}
                    >
                      {label}
                    </span>
                    {!isLast && (
                      <div className="mx-3 hidden h-px flex-1 bg-line sm:block">
                        <div
                          className={cn(
                            'h-px bg-ink transition-transform duration-700 ease-out',
                            index < progress - 1 ? 'scale-x-100' : 'scale-x-0'
                          )}
                          style={{ transformOrigin: 'left center' }}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
        <MagicLinkCard link={magicLink} />
      </div>

      <Card className="animate-fade-up" style={{ animationDelay: '220ms' }}>
        <CardContent className="p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
            Interview questions
          </p>
          <ol className="mt-5 space-y-4">
            {questions.map((question, index) => (
              <li key={question.id} className="flex gap-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-subtle font-mono text-xs font-semibold text-ink-secondary">
                  {index + 1}
                </span>
                <span className="text-[15px] leading-relaxed text-ink-secondary">
                  {question.text}
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
