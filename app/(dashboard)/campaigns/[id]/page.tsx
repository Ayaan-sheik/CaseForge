import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { RetryProcessingButton } from '@/components/dashboard/RetryProcessingButton';
import { cn } from '@/lib/utils/cn';
import type { Campaign, Question } from '@/lib/types';

const TIMELINE_STEPS = [
  'Link Sent',
  'Interview Started',
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {campaign.client_name}
            </h1>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {campaign.service_provided}
          </p>
        </div>
        {campaign.status === 'complete' && (
          <Link href={`/campaigns/${campaign.id}/outputs`}>
            <Button>View Outputs →</Button>
          </Link>
        )}
      </div>

      {campaign.status === 'error' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="space-y-3 p-6">
            <p className="font-medium text-red-800">
              Something went wrong while generating this case study.
            </p>
            {campaign.error_message && (
              <p className="text-sm text-red-600">{campaign.error_message}</p>
            )}
            <RetryProcessingButton campaignId={campaign.id} />
          </CardContent>
        </Card>
      )}

      {campaign.status === 'complete' ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600">
              🎉 The interview is done and the case study has been generated.
              Head to{' '}
              <Link
                href={`/campaigns/${campaign.id}/outputs`}
                className="font-medium text-indigo-600 hover:underline"
              >
                Outputs
              </Link>{' '}
              to grab the PDF, public page, and LinkedIn quotes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-0">
              {TIMELINE_STEPS.map((label, index) => {
                const done = index < progress;
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
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                        done
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-400'
                      )}
                    >
                      {done ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                    <span
                      className={cn(
                        'text-sm',
                        done
                          ? 'font-medium text-slate-900'
                          : 'text-slate-400'
                      )}
                    >
                      {label}
                    </span>
                    {!isLast && (
                      <div
                        className={cn(
                          'mx-3 hidden h-0.5 flex-1 sm:block',
                          index < progress - 1
                            ? 'bg-slate-900'
                            : 'bg-slate-200'
                        )}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Magic link</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {magicLink}
          </p>
          <CopyButton value={magicLink} variant="outline" size="sm" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interview questions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {questions.map((question, index) => (
              <li key={question.id} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  {index + 1}
                </span>
                <span className="text-slate-700">{question.text}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
