'use client';

import { useState } from 'react';
import { X, Mail, MessageSquare, ChevronDown, Bell } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { CopyButton } from '@/components/ui/copy-button';
import type { StalledInfo } from '@/lib/utils/stalledInfo';

interface SendReminderModalProps {
  clientName: string;
  magicLink: string;
  stalledInfo: StalledInfo;
  isOpen: boolean;
  onClose: () => void;
}

function buildTemplates(clientName: string, magicLink: string, reason: string) {
  const reasonContext: Record<string, string> = {
    'Link unopened for 3 days':
      "I wanted to follow up — the link below is still waiting for you whenever you have 90 seconds to spare.",
    'Link opened, but no audio recorded':
      "I noticed you opened the link but didn't get a chance to record. No worries — it only takes about 90 seconds whenever you're ready.",
    'Audio too short':
      "It looks like there may have been a technical hiccup with your recording. Could you give it another quick try? It only takes about 90 seconds.",
  };

  const context = reasonContext[reason] ?? "I wanted to follow up on your case study interview link.";

  const emailSubject = `Quick follow-up on your case study interview`;
  const emailBody = `Hi ${clientName},

${context}

Here's your interview link:
${magicLink}

It's just 3 quick questions and takes about 90 seconds to complete — you can do it from your phone.

Thanks so much!`;

  const smsBody = `Hey ${clientName}! Just following up on the case study interview — ${context.toLowerCase()} Here's the link: ${magicLink} (takes ~90 seconds on your phone)`;

  return { emailSubject, emailBody, smsBody };
}

export function SendReminderModal({
  clientName,
  magicLink,
  stalledInfo,
  isOpen,
  onClose,
}: SendReminderModalProps) {
  const [emailOpen, setEmailOpen] = useState(true);
  const [smsOpen, setSmsOpen] = useState(false);

  if (!isOpen) return null;

  const { emailSubject, emailBody, smsBody } = buildTemplates(
    clientName,
    magicLink,
    stalledInfo.reason
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Send reminder to ${clientName}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="animate-fade-up relative z-10 w-full max-w-lg rounded-t-[24px] bg-paper shadow-2xl sm:rounded-[24px]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-600" />
              <p className="font-display text-[17px] font-semibold tracking-tight">
                Send a nudge to {clientName}
              </p>
            </div>
            <p className="mt-1 text-[13px] text-amber-700">
              {stalledInfo.reason}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="space-y-3 p-6">
          {/* Email template */}
          <div className="overflow-hidden rounded-[14px] border border-line bg-white">
            <button
              type="button"
              className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-paper"
              onClick={() => setEmailOpen((o) => !o)}
            >
              <span className="flex items-center gap-2 font-medium text-[14px] text-ink">
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
              <div className="animate-fade-in space-y-3 border-t border-line px-4 pb-4 pt-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-secondary">
                    Subject
                  </p>
                  <p className="mt-1 text-[13px] text-ink">{emailSubject}</p>
                </div>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-secondary">
                    Body
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-secondary">
                    {emailBody}
                  </p>
                </div>
                <CopyButton
                  variant="outline"
                  size="sm"
                  value={`Subject: ${emailSubject}\n\n${emailBody}`}
                >
                  Copy email
                </CopyButton>
              </div>
            )}
          </div>

          {/* SMS template */}
          <div className="overflow-hidden rounded-[14px] border border-line bg-white">
            <button
              type="button"
              className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-paper"
              onClick={() => setSmsOpen((o) => !o)}
            >
              <span className="flex items-center gap-2 font-medium text-[14px] text-ink">
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
              <div className="animate-fade-in space-y-3 border-t border-line px-4 pb-4 pt-3">
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-secondary">
                  {smsBody}
                </p>
                <CopyButton variant="outline" size="sm" value={smsBody}>
                  Copy SMS
                </CopyButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
