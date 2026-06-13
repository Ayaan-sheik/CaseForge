'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function CopyMagicLinkButton({
  magicLink,
  className,
}: {
  magicLink: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(magicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy interview link'}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-muted transition-all duration-200',
        copied
          ? 'border-success/40 bg-success/10 text-[#2E8B61]'
          : 'hover:border-ink/30 hover:bg-paper hover:text-ink',
        className
      )}
    >
      {copied ? (
        <Check className="animate-scale-in h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      <span className="sr-only">{copied ? 'Copied' : 'Copy interview link'}</span>
    </button>
  );
}
