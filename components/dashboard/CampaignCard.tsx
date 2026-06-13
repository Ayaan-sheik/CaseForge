import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { relativeTime } from '@/lib/utils/relativeTime';
import type { Campaign } from '@/lib/types';

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <Link href={`/campaigns/${campaign.id}`} className="group block">
      <div className="hover-lift flex items-center justify-between gap-4 rounded-[18px] border border-line bg-white p-5 sm:p-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="truncate font-display text-base font-semibold tracking-tight">
              {campaign.client_name}
            </h3>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="mt-1 truncate text-sm text-ink-secondary">
            {campaign.service_provided}
          </p>
          <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
            {relativeTime(campaign.created_at)}
          </p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-muted transition-all duration-200 group-hover:border-ink group-hover:bg-ink group-hover:text-paper">
          <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
