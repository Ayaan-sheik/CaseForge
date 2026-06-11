import { cn } from '@/lib/utils/cn';
import type { CampaignStatus } from '@/lib/types';

const STATUS_STYLES: Record<
  CampaignStatus,
  { label: string; className: string; dot: string; pulse?: boolean }
> = {
  draft: {
    label: 'Draft',
    className: 'bg-subtle text-ink-secondary ring-line',
    dot: 'bg-ink-muted',
  },
  sent: {
    label: 'Sent',
    className: 'bg-subtle text-ink-secondary ring-line',
    dot: 'bg-ink',
  },
  recording: {
    label: 'Recording',
    className: 'bg-accent-soft text-accent ring-accent/20',
    dot: 'bg-accent',
    pulse: true,
  },
  processing: {
    label: 'Processing',
    className: 'bg-accent-soft text-accent ring-accent/20',
    dot: 'bg-accent',
    pulse: true,
  },
  complete: {
    label: 'Complete',
    className: 'bg-success/10 text-[#2E8B61] ring-success/30',
    dot: 'bg-success',
  },
  error: {
    label: 'Needs attention',
    className: 'bg-accent-soft text-accent ring-accent/30',
    dot: 'bg-accent',
  },
};

export function StatusBadge({ status }: { status: CampaignStatus }) {
  const config = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] ring-1 ring-inset',
        config.className
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {config.pulse && (
          <span
            className={cn(
              'animate-ring absolute inline-flex h-full w-full rounded-full',
              config.dot
            )}
          />
        )}
        <span
          className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', config.dot)}
        />
      </span>
      {config.label}
    </span>
  );
}
