import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base leading-relaxed shadow-[0_1px_2px_rgb(25_21_16/0.02)] transition-all duration-200 placeholder:text-ink-muted hover:border-ink-muted/60 focus-visible:border-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/[0.06] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export { Textarea };
