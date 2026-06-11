'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Mail, MessageSquare, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CopyButton } from '@/components/ui/copy-button';
import { MagicLinkCard } from '@/components/dashboard/MagicLinkCard';
import { cn } from '@/lib/utils/cn';
import type { Question } from '@/lib/types';

type Step = 1 | 2 | 3;

const STEP_LABELS = ['The work', 'The questions', 'The link'];

export default function NewCampaignPage() {
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1
  const [clientName, setClientName] = useState('');
  const [serviceProvided, setServiceProvided] = useState('');

  // Step 2
  const [campaignId, setCampaignId] = useState('');
  const [magicToken, setMagicToken] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  // Step 3
  const [emailOpen, setEmailOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== 'undefined' ? window.location.origin : '');
  const shareLink = `${appUrl}/interview/${magicToken}`;

  const emailTemplate = {
    subject: 'Quick favor — 90 seconds of your time?',
    body: `Hi ${clientName},\n\nI'd love to feature our work together as a case study. You just answer 3 quick questions with your voice, right from your phone — no typing, no calls, about 90 seconds total.\n\nHere's your link: ${shareLink}\n\nThanks so much!`,
  };

  const smsTemplate = `Hi ${clientName}! Could you share quick feedback on our work together? 3 voice questions, ~90 seconds, right from your phone: ${shareLink}`;

  async function handleGenerateQuestions(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientName, serviceProvided }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong — please try again.');
      setLoading(false);
      return;
    }

    setCampaignId(data.campaignId);
    setMagicToken(data.magicToken);
    setQuestions(data.questions);
    setLoading(false);
    setStep(2);
  }

  async function handleRegenerate(questionId: string) {
    setError('');
    setRegenerating(questionId);

    const res = await fetch(`/api/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'regenerate_question',
        questionId,
        questions,
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? 'Regeneration failed — please try again.');
    } else {
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? data.question : q))
      );
    }
    setRegenerating(null);
  }

  async function handleCreateCampaign() {
    setError('');
    setLoading(true);

    const res = await fetch(`/api/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sent', questions }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? 'Could not create campaign — please try again.');
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep(3);
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Step indicator */}
      <div className="mb-10 flex items-center justify-center gap-6">
        {STEP_LABELS.map((label, i) => {
          const s = (i + 1) as Step;
          return (
            <div key={label} className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'h-1.5 w-16 overflow-hidden rounded-full bg-line sm:w-24'
                )}
              >
                <div
                  className={cn(
                    'h-full rounded-full bg-ink transition-transform duration-500 ease-out',
                    s <= step ? 'scale-x-100' : 'scale-x-0'
                  )}
                  style={{ transformOrigin: 'left center' }}
                />
              </div>
              <span
                className={cn(
                  'font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-300',
                  s <= step ? 'text-ink' : 'text-ink-muted'
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <Card className="animate-fade-up">
          <CardHeader>
            <CardTitle className="text-xl">New campaign</CardTitle>
            <CardDescription className="font-editorial text-base italic">
              Tell us who you worked with — we&apos;ll write the questions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateQuestions} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client or company name</Label>
                <Input
                  id="clientName"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Acme Inc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceProvided">Service you provided</Label>
                <Input
                  id="serviceProvided"
                  required
                  value={serviceProvided}
                  onChange={(e) => setServiceProvided(e.target.value)}
                  placeholder="e.g. email marketing automation, CFO advisory, PR campaign"
                />
              </div>
              {error && <p className="text-sm text-accent">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Writing your questions…' : 'Generate questions'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="animate-fade-up space-y-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Review the questions
            </h1>
            <p className="mt-1 font-editorial text-base italic text-ink-muted">
              Edit anything that doesn&apos;t sound like you.
            </p>
          </div>

          {questions.map((question, index) => (
            <Card
              key={question.id}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                    Question {index + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRegenerate(question.id)}
                    disabled={regenerating !== null || loading}
                  >
                    <RefreshCw
                      className={cn(
                        'h-3.5 w-3.5',
                        regenerating === question.id && 'animate-spin'
                      )}
                    />
                    {regenerating === question.id
                      ? 'Rewriting…'
                      : 'Rewrite'}
                  </Button>
                </div>
                <Textarea
                  value={question.text}
                  rows={3}
                  onChange={(e) =>
                    setQuestions((prev) =>
                      prev.map((q) =>
                        q.id === question.id
                          ? { ...q, text: e.target.value }
                          : q
                      )
                    )
                  }
                />
              </CardContent>
            </Card>
          ))}

          {error && <p className="text-sm text-accent">{error}</p>}
          <Button
            className="w-full"
            disabled={loading || regenerating !== null}
            onClick={handleCreateCampaign}
          >
            {loading ? 'Creating…' : 'Create campaign & get the link'}
          </Button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {/* Celebration header */}
          <div className="animate-scale-in flex flex-col items-center pb-2 pt-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-7 w-7"
                aria-hidden="true"
              >
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
            <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">
              Your campaign is live
            </h1>
            <p className="mt-1.5 max-w-sm font-editorial text-base italic text-ink-muted">
              Send this to {clientName} — they can answer from their phone,
              whenever suits them.
            </p>
          </div>

          <div
            className="animate-fade-up"
            style={{ animationDelay: '250ms' }}
          >
            <MagicLinkCard link={shareLink} />
          </div>

          <Card
            className="animate-fade-up overflow-hidden"
            style={{ animationDelay: '400ms' }}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-subtle/60"
              onClick={() => setEmailOpen((open) => !open)}
            >
              <span className="flex items-center gap-2.5 font-medium text-ink">
                <Mail className="h-4 w-4 text-ink-muted" />
                Email template
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-ink-muted transition-transform duration-200',
                  emailOpen && 'rotate-180'
                )}
              />
            </button>
            {emailOpen && (
              <CardContent className="animate-fade-in space-y-4 pt-0">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                    Subject
                  </p>
                  <p className="mt-1 text-sm text-ink">
                    {emailTemplate.subject}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                    Body
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-secondary">
                    {emailTemplate.body}
                  </p>
                </div>
                <CopyButton
                  variant="outline"
                  size="sm"
                  value={`Subject: ${emailTemplate.subject}\n\n${emailTemplate.body}`}
                >
                  Copy email
                </CopyButton>
              </CardContent>
            )}
          </Card>

          <Card
            className="animate-fade-up overflow-hidden"
            style={{ animationDelay: '500ms' }}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-subtle/60"
              onClick={() => setSmsOpen((open) => !open)}
            >
              <span className="flex items-center gap-2.5 font-medium text-ink">
                <MessageSquare className="h-4 w-4 text-ink-muted" />
                SMS template
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-ink-muted transition-transform duration-200',
                  smsOpen && 'rotate-180'
                )}
              />
            </button>
            {smsOpen && (
              <CardContent className="animate-fade-in space-y-4 pt-0">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-secondary">
                  {smsTemplate}
                </p>
                <CopyButton variant="outline" size="sm" value={smsTemplate}>
                  Copy SMS
                </CopyButton>
              </CardContent>
            )}
          </Card>

          <div
            className="animate-fade-up"
            style={{ animationDelay: '600ms' }}
          >
            <Link href="/dashboard" className="block">
              <Button variant="outline" className="w-full">
                Go to dashboard
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
