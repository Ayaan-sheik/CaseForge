'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Mail,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CopyButton } from '@/components/ui/copy-button';
import { MagicLinkCard } from '@/components/dashboard/MagicLinkCard';
import { cn } from '@/lib/utils/cn';
import { BUILDER_QUESTIONS } from '@/lib/builder/questions';
import type { Question } from '@/lib/types';

type Step = 1 | 2 | 3;
type Turn = { role: 'assistant' | 'user'; text: string };

const STEP_LABELS = [
  { label: 'The work', ts: '00:00' },
  { label: 'The questions', ts: '00:10' },
  { label: 'The link', ts: '05:00' },
];

export default function NewCampaignPage() {
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1 — guided brief chat
  const [builderStep, setBuilderStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState('');

  const [campaignId, setCampaignId] = useState('');
  const [magicToken, setMagicToken] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const [emailOpen, setEmailOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);

  const clientName = answers.client_name ?? '';

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== 'undefined' ? window.location.origin : '');
  const shareLink = `${appUrl}/interview/${magicToken}`;

  const emailTemplate = {
    subject: 'Quick favor — a few minutes of your time?',
    body: `Hi ${clientName},\n\nI'd love to feature our work together as a case study. You just answer a few quick questions with your voice, right from your phone — no typing, no calls.\n\nHere's your link: ${shareLink}\n\nThanks so much!`,
  };

  const smsTemplate = `Hi ${clientName}! Could you share quick feedback on our work together? A few voice questions, right from your phone: ${shareLink}`;

  const current = BUILDER_QUESTIONS[builderStep];
  const isLastBuilder = builderStep === BUILDER_QUESTIONS.length - 1;

  // Visible transcript of the brief chat so far.
  const transcript: Turn[] = [];
  for (let i = 0; i < builderStep; i++) {
    const q = BUILDER_QUESTIONS[i];
    transcript.push({ role: 'assistant', text: q.prompt });
    transcript.push({ role: 'user', text: answers[q.key] ?? '' });
  }

  async function handleBuilderNext() {
    if (!draft.trim()) return;
    const updated = { ...answers, [current.key]: draft.trim() };
    setAnswers(updated);
    setDraft('');
    setError('');

    if (!isLastBuilder) {
      setBuilderStep((s) => s + 1);
      return;
    }

    // Brief complete — structure it + generate questions.
    setLoading(true);
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: updated.client_name,
        clientIndustry: updated.client_industry,
        clientSize: updated.client_size,
        briefAnswers: {
          problem: updated.problem,
          what_delivered: updated.what_delivered,
          what_changed: updated.what_changed,
        },
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !Array.isArray(data.questions)) {
      setError(data.error ?? 'Something went wrong — please try again.');
      setLoading(false);
      // Stay on the last question so they can resubmit.
      setAnswers(answers);
      setDraft(updated[current.key]);
      return;
    }

    setCampaignId(data.campaignId);
    setMagicToken(data.magicToken);
    setQuestions(data.questions);
    setLoading(false);
    setStep(2);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Enter submits short answers; Cmd/Ctrl+Enter submits long ones.
    if (e.key === 'Enter' && (current.short || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleBuilderNext();
    }
  }

  async function handleRegenerate(questionId: string) {
    setError('');
    setRegenerating(questionId);

    const res = await fetch(`/api/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'regenerate_question', questionId, questions }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.question?.text) {
      setError(data.error ?? 'Regeneration failed — please try again.');
    } else {
      setQuestions((prev) => prev.map((q) => (q.id === questionId ? data.question : q)));
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
      {step < 3 && (
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-1.5 text-[14px] text-ink-secondary transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
      )}

      {/* Tape-rail step indicator */}
      <div className="tape-rail mb-12">
        {STEP_LABELS.map((s, i) => {
          const stepNum = (i + 1) as Step;
          const done = stepNum < step;
          const active = stepNum === step;
          return (
            <div key={s.label} className={cn('tape-step', done ? 'done' : active ? 'active' : '')}>
              <p className="font-mono text-[12.5px] tracking-[0.08em] text-accent">{s.ts}</p>
              <h3
                className={cn(
                  'mt-2.5 font-display text-[17px] font-semibold leading-tight tracking-[-0.01em]',
                  !done && !active && 'text-ink-secondary'
                )}
              >
                {s.label}
              </h3>
            </div>
          );
        })}
      </div>

      {/* Step 1: Guided brief chat */}
      {step === 1 && (
        <div className="animate-fade-up">
          <p className="eyebrow">New campaign</p>
          <h1 className="mt-4 font-display text-[24px] font-semibold leading-tight tracking-[-0.02em]">
            Tell us about the work
          </h1>
          <p className="mt-1.5 font-editorial italic text-[15px] text-ink-secondary">
            A few quick questions — we&apos;ll turn them into the interview your client answers.
          </p>

          <div className="mt-8 space-y-3">
            {transcript.map((turn, i) => (
              <div
                key={i}
                className={cn('flex', turn.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-[16px] px-4 py-3 text-[14px] leading-relaxed',
                    turn.role === 'user'
                      ? 'bg-ink text-paper'
                      : 'border border-line bg-white text-ink'
                  )}
                >
                  {turn.text}
                </div>
              </div>
            ))}

            {!loading && (
              <div className="animate-fade-up flex justify-start">
                <div className="max-w-[85%] rounded-[16px] border border-line bg-white px-4 py-3 text-[14px] leading-relaxed text-ink">
                  {current.prompt}
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <p className="mt-6 text-center font-editorial italic text-[15px] text-ink-secondary">
              Writing your questions…
            </p>
          ) : (
            <div className="mt-5">
              {current.short ? (
                <Input
                  value={draft}
                  autoFocus
                  placeholder={current.placeholder}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              ) : (
                <Textarea
                  value={draft}
                  rows={3}
                  autoFocus
                  placeholder={current.placeholder}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              )}
              {error && (
                <p className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{error}</p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[12px] text-ink-secondary">
                  {builderStep + 1} of {BUILDER_QUESTIONS.length}
                </span>
                <Button onClick={handleBuilderNext} disabled={!draft.trim()}>
                  {isLastBuilder ? 'Generate questions' : 'Next'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Questions */}
      {step === 2 && (
        <div className="animate-fade-up space-y-4">
          <div className="rounded-[20px] border border-line bg-white p-8">
            <p className="eyebrow">Review questions</p>
            <h1 className="mt-4 font-display text-[24px] font-semibold leading-tight tracking-[-0.02em]">
              Edit anything that doesn&apos;t sound like you
            </h1>
            <p className="mt-1.5 font-editorial italic text-[15px] text-ink-secondary">
              These are the core questions your client answers out loud. We&apos;ll ask smart
              follow-ups automatically.
            </p>
          </div>

          {questions.map((question, index) => (
            <div
              key={question.id}
              className="animate-fade-up rounded-[18px] border border-line bg-white p-6"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[11.5px] uppercase tracking-[0.12em] text-accent">
                  Question {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRegenerate(question.id)}
                  disabled={regenerating !== null || loading}
                >
                  <RefreshCw
                    className={cn('h-3.5 w-3.5', regenerating === question.id && 'animate-spin')}
                  />
                  {regenerating === question.id ? 'Rewriting…' : 'Rewrite'}
                </Button>
              </div>
              <Textarea
                value={question.text}
                rows={3}
                onChange={(e) =>
                  setQuestions((prev) =>
                    prev.map((q) => (q.id === question.id ? { ...q, text: e.target.value } : q))
                  )
                }
              />
            </div>
          ))}

          {error && (
            <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{error}</p>
          )}
          <Button
            className="w-full"
            disabled={loading || regenerating !== null}
            onClick={handleCreateCampaign}
          >
            {loading ? 'Creating…' : 'Create campaign & get the link'}
          </Button>
        </div>
      )}

      {/* Step 3: The link */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="animate-scale-in rounded-[20px] border border-line bg-white p-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
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
            <h1 className="mt-5 font-display text-[24px] font-semibold tracking-tight">
              Your campaign is live
            </h1>
            <p className="mt-2 max-w-sm mx-auto font-editorial italic text-[15px] text-ink-secondary">
              Send this to {clientName} — they can answer from their phone, whenever suits them.
            </p>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: '250ms' }}>
            <MagicLinkCard link={shareLink} />
          </div>

          {/* Email template */}
          <div
            className="animate-fade-up overflow-hidden rounded-[18px] border border-line bg-white"
            style={{ animationDelay: '400ms' }}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-paper"
              onClick={() => setEmailOpen((open) => !open)}
            >
              <span className="flex items-center gap-2.5 font-medium text-ink">
                <Mail className="h-4 w-4 text-ink-secondary" />
                Email template
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-ink-secondary transition-transform duration-200',
                  emailOpen && 'rotate-180'
                )}
              />
            </button>
            {emailOpen && (
              <div className="animate-fade-in space-y-4 border-t border-line px-6 pb-6 pt-5">
                <div>
                  <p className="font-mono text-[11.5px] uppercase tracking-[0.12em] text-ink-secondary">
                    Subject
                  </p>
                  <p className="mt-1.5 text-[14px] text-ink">{emailTemplate.subject}</p>
                </div>
                <div>
                  <p className="font-mono text-[11.5px] uppercase tracking-[0.12em] text-ink-secondary">
                    Body
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-secondary">
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
              </div>
            )}
          </div>

          {/* SMS template */}
          <div
            className="animate-fade-up overflow-hidden rounded-[18px] border border-line bg-white"
            style={{ animationDelay: '500ms' }}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-paper"
              onClick={() => setSmsOpen((open) => !open)}
            >
              <span className="flex items-center gap-2.5 font-medium text-ink">
                <MessageSquare className="h-4 w-4 text-ink-secondary" />
                SMS template
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-ink-secondary transition-transform duration-200',
                  smsOpen && 'rotate-180'
                )}
              />
            </button>
            {smsOpen && (
              <div className="animate-fade-in space-y-4 border-t border-line px-6 pb-6 pt-5">
                <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink-secondary">
                  {smsTemplate}
                </p>
                <CopyButton variant="outline" size="sm" value={smsTemplate}>
                  Copy SMS
                </CopyButton>
              </div>
            )}
          </div>

          <div className="animate-fade-up" style={{ animationDelay: '600ms' }}>
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
