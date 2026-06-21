'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils/cn';
import { ONBOARDING_QUESTIONS } from '@/lib/onboarding/questions';

type Turn = { role: 'assistant' | 'user'; text: string };

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');

  // Build the visible transcript from answers given so far.
  const transcript: Turn[] = [];
  for (let i = 0; i < step; i++) {
    const q = ONBOARDING_QUESTIONS[i];
    transcript.push({ role: 'assistant', text: q.prompt });
    transcript.push({ role: 'user', text: answers[q.key] ?? '' });
  }

  const current = ONBOARDING_QUESTIONS[step];
  const isLast = step === ONBOARDING_QUESTIONS.length - 1;

  async function handleNext() {
    if (!draft.trim()) return;
    const updated = { ...answers, [current.key]: draft.trim() };
    setAnswers(updated);
    setDraft('');
    setError('');

    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }

    // Last answer captured — structure + save.
    setLoading(true);
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: updated }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.summary) {
      setError(data.error ?? 'Something went wrong — please try again.');
      setLoading(false);
      // Roll back to the last question so they can resubmit.
      setAnswers(answers);
      setDraft(updated[current.key]);
      return;
    }

    setSummary(data.summary);
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleNext();
    }
  }

  // Confirmation screen
  if (summary) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="animate-scale-in rounded-[20px] border border-line bg-white p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
            <Check className="h-7 w-7 text-success" strokeWidth={2.5} />
          </span>
          <h1 className="mt-5 font-display text-[24px] font-semibold tracking-tight">
            You&apos;re all set
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-secondary">
            {summary}
          </p>
          <p className="mt-4 font-editorial italic text-[14px] text-ink-secondary">
            You can refine any of this later in Settings.
          </p>
          <Button
            className="mt-7"
            onClick={() => {
              router.push('/dashboard');
              router.refresh();
            }}
          >
            Go to dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <p className="eyebrow">Welcome</p>
        <h1 className="mt-3 font-display text-[26px] font-semibold leading-tight tracking-[-0.02em]">
          Let&apos;s learn about your business
        </h1>
        <p className="mt-1.5 font-editorial italic text-[15px] text-ink-secondary">
          A few quick questions so every case study sounds like you. Takes about a minute.
        </p>
      </div>

      {/* Progress */}
      <div className="mb-6 flex items-center gap-1.5">
        {ONBOARDING_QUESTIONS.map((q, i) => (
          <span
            key={q.key}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i < step ? 'bg-accent' : i === step ? 'bg-accent/40' : 'bg-line'
            )}
          />
        ))}
      </div>

      {/* Transcript */}
      <div className="space-y-3">
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

        {/* Current question */}
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
          Putting together your profile…
        </p>
      ) : (
        <div className="mt-5">
          <Textarea
            value={draft}
            rows={3}
            autoFocus
            placeholder={current.placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {error && (
            <p className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{error}</p>
          )}
          <div className="mt-3 flex items-center justify-between">
            <span className="font-mono text-[12px] text-ink-secondary">
              {step + 1} of {ONBOARDING_QUESTIONS.length}
            </span>
            <Button onClick={handleNext} disabled={!draft.trim()}>
              {isLast ? 'Finish' : 'Next'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
