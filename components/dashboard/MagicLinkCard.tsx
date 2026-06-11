'use client';

import { useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * The magic link, treated like the artifact it is: a live, pulsing link on
 * paper with a copy interaction that pays off in green.
 */
export function MagicLinkCard({
  link,
  className,
}: {
  link: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — ignore
    }
  }

  return (
    <div
      className={cn(
        'rounded-[20px] border border-line bg-surface shadow-[0_1px_2px_rgb(25_21_16/0.03)]',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          <Link2 className="h-3.5 w-3.5" />
          Magic link
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ring absolute h-full w-full rounded-full bg-accent" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          Live
        </span>
      </div>

      <div className="p-5">
        <p className="break-all rounded-xl border border-dashed border-line bg-subtle px-4 py-3.5 text-center font-mono text-sm text-ink">
          {link}
        </p>

        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2 active:scale-[0.98]',
            copied
              ? 'bg-success/15 text-[#2E8B61]'
              : 'bg-ink text-paper shadow-sm hover:-translate-y-0.5 hover:bg-[#2A241C] hover:shadow-md'
          )}
        >
          {copied ? (
            <>
              <Check className="animate-scale-in h-4 w-4" />
              Copied — go send it
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy link
            </>
          )}
        </button>
      </div>
    </div>
  );
}
