import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-50 active:translate-y-0 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-ink text-paper shadow-sm hover:-translate-y-0.5 hover:bg-[#2A241C] hover:shadow-md',
        accent:
          'bg-accent text-white shadow-sm hover:-translate-y-0.5 hover:bg-[#D93426] hover:shadow-md',
        outline:
          'border border-line bg-surface text-ink shadow-sm hover:-translate-y-0.5 hover:border-ink-muted hover:bg-subtle',
        ghost: 'text-ink-secondary hover:bg-subtle hover:text-ink',
        destructive:
          'bg-accent text-white shadow-sm hover:-translate-y-0.5 hover:bg-[#D93426]',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 px-4 text-xs',
        lg: 'h-12 px-7 text-[15px]',
        xl: 'h-16 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
);
Button.displayName = 'Button';

export { Button, buttonVariants };
