import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed shadow-[0_1px_2px_rgb(0_0_0/0.03)] transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/[0.06] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export { Textarea };
