import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

/** Brand mark: rounded ink square with three waveform bars. */
export function LogoMark({
  className,
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <span
      className={cn(
        'flex h-8 w-8 items-center justify-center gap-[3px] rounded-[10px] bg-slate-900',
        className
      )}
      aria-hidden="true"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn('w-[3px] rounded-full bg-white', animated && 'wave-bar')}
          style={{
            height: i === 1 ? '14px' : '8px',
            animationDelay: animated ? `${i * 0.18}s` : undefined,
          }}
        />
      ))}
    </span>
  );
}

export function Logo({
  href = '/',
  className,
  animated = false,
}: {
  href?: string;
  className?: string;
  animated?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 text-[17px] font-semibold tracking-tight text-slate-900',
        className
      )}
    >
      <LogoMark animated={animated} />
      CaseForge
    </Link>
  );
}
