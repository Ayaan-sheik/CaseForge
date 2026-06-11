import { cn } from '@/lib/utils/cn';
import type { CampaignStatus } from '@/lib/types';

const STATUS_STYLES: Record<
  CampaignStatus,
  { label: string; className: string; dot: string; pulse?: boolean }
> = {
  draft: {
    label: 'Draft',
    className: 'bg-slate-50 text-slate-600 ring-slate-500/15',
    dot: 'bg-slate-400',
  },
  sent: {
    label: 'Sent',
    className: 'bg-blue-50 text-blue-700 ring-blue-600/15',
    dot: 'bg-blue-500',
  },
  recording: {
    label: 'Recording',
    className: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    dot: 'bg-amber-500',
    pulse: true,
  },
  processing: {
    label: 'Processing',
    className: 'bg-orange-50 text-orange-700 ring-orange-600/20',
    dot: 'bg-orange-500',
    pulse: true,
  },
  complete: {
    label: 'Complete',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    dot: 'bg-emerald-500',
  },
  error: {
    label: 'Error',
    className: 'bg-red-50 text-red-700 ring-red-600/20',
    dot: 'bg-red-500',
  },
};

export function StatusBadge({ status }: { status: CampaignStatus }) {
  const config = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        config.className
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {config.pulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60',
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
