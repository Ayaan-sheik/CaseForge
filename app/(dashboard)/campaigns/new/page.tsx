'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, RefreshCw } from 'lucide-react';
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
import { cn } from '@/lib/utils/cn';
import type { Question } from '@/lib/types';

type Step = 1 | 2 | 3;

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
      <div className="mb-8 flex items-center justify-center gap-2">
        {([1, 2, 3] as Step[]).map((s) => (
          <div
            key={s}
            className={cn(
              'h-2 w-16 rounded-full',
              'transition-colors duration-500',
              s <= step ? 'bg-slate-900' : 'bg-slate-200'
            )}
          />
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>New Campaign</CardTitle>
            <CardDescription>
              Tell us who you worked with and what you did — we&apos;ll write
              the interview questions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateQuestions} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client or Company Name</Label>
                <Input
                  id="clientName"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Acme Inc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceProvided">Service You Provided</Label>
                <Input
                  id="serviceProvided"
                  required
                  value={serviceProvided}
                  onChange={(e) => setServiceProvided(e.target.value)}
                  placeholder="e.g. email marketing automation, CFO advisory, PR campaign"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Generating questions…' : 'Generate Questions →'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Review Questions
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Edit anything that doesn&apos;t sound like you, or regenerate a
              question entirely.
            </p>
          </div>

          {questions.map((question, index) => (
            <Card key={question.id}>
              <CardContent className="p-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
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
                      ? 'Regenerating…'
                      : 'Regenerate this question'}
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

          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            className="w-full"
            disabled={loading || regenerating !== null}
            onClick={handleCreateCampaign}
          >
            {loading ? 'Creating…' : 'Create Campaign & Get Share Link'}
          </Button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>🎉 Your campaign is live</CardTitle>
              <CardDescription>
                Send this link to {clientName} — they can record right from
                their phone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="break-all rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm font-medium text-slate-700">
                {shareLink}
              </div>
              <CopyButton value={shareLink} size="lg" className="w-full">
                Copy link to clipboard
              </CopyButton>
            </CardContent>
          </Card>

          <Card>
            <button
              type="button"
              className="flex w-full items-center justify-between p-6 text-left"
              onClick={() => setEmailOpen((open) => !open)}
            >
              <span className="font-medium text-slate-900">
                📧 Email template
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-slate-400 transition-transform',
                  emailOpen && 'rotate-180'
                )}
              />
            </button>
            {emailOpen && (
              <CardContent className="space-y-3 pt-0">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Subject
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {emailTemplate.subject}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Body
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
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

          <Card>
            <button
              type="button"
              className="flex w-full items-center justify-between p-6 text-left"
              onClick={() => setSmsOpen((open) => !open)}
            >
              <span className="font-medium text-slate-900">
                💬 SMS template
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-slate-400 transition-transform',
                  smsOpen && 'rotate-180'
                )}
              />
            </button>
            {smsOpen && (
              <CardContent className="space-y-3 pt-0">
                <p className="whitespace-pre-wrap text-sm text-slate-700">
                  {smsTemplate}
                </p>
                <CopyButton variant="outline" size="sm" value={smsTemplate}>
                  Copy SMS
                </CopyButton>
              </CardContent>
            )}
          </Card>

          <Link href="/dashboard" className="block">
            <Button variant="outline" className="w-full">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
