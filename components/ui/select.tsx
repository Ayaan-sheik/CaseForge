'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  className?: string;
  align?: 'left' | 'right';
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
  align = 'left',
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-4 text-xs font-medium text-ink shadow-sm transition-all duration-200 hover:border-ink-muted hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        {label && <span className="text-ink-muted">{label}:</span>}
        <span>{selected?.label ?? ''}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-ink-muted transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className={cn(
            'absolute z-40 mt-1.5 min-w-[9rem] overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-3.5 py-1.5 text-left text-sm transition-colors',
                    active ? 'bg-subtle font-medium text-ink' : 'text-ink-secondary hover:bg-subtle hover:text-ink'
                  )}
                >
                  {opt.label}
                  {active && <Check className="h-3.5 w-3.5 shrink-0 text-ink" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
