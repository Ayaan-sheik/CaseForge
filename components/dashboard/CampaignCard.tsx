import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { relativeTime } from '@/lib/utils/relativeTime';
import type { Campaign } from '@/lib/types';

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <Link href={`/campaigns/${campaign.id}`} className="group block">
      <div className="hover-lift flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="truncate text-base font-semibold tracking-tight">
              {campaign.client_name}
            </h3>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="mt-1 truncate text-sm text-slate-500">
            {campaign.service_provided}
          </p>
          <p className="mt-1.5 text-xs text-slate-400">
            {relativeTime(campaign.created_at)}
          </p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-all duration-200 group-hover:border-slate-900 group-hover:bg-slate-900 group-hover:text-white">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
