'use client';

import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface CopyButtonProps extends Omit<ButtonProps, 'onClick'> {
  value: string;
  label?: string;
}

/** Copies `value` to the clipboard and flashes a confirmation. */
export function CopyButton({
  value,
  label = 'Copy',
  children,
  className,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — ignore
    }
  }

  return (
    <Button
      type="button"
      onClick={handleCopy}
      className={cn(
        copied &&
          'border-success/40 bg-success/10 text-[#2E8B61] hover:bg-success/10',
        className
      )}
      {...props}
    >
      {copied ? (
        <Check className="animate-scale-in h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {children ?? (copied ? 'Copied!' : label)}
    </Button>
  );
}
