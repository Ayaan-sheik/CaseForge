import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm shadow-[0_1px_2px_rgb(0_0_0/0.03)] transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/[0.06] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export { Input };
