'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Bell, Eye, Trash2 } from 'lucide-react';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { CopyMagicLinkButton } from '@/components/dashboard/CopyMagicLinkButton';
import { SendReminderModal } from '@/components/dashboard/SendReminderModal';
import { DeleteCampaignModal } from '@/components/dashboard/DeleteCampaignModal';
import { relativeTime } from '@/lib/utils/relativeTime';
import { cn } from '@/lib/utils/cn';
import type { Campaign } from '@/lib/types';
import type { StalledInfo } from '@/lib/utils/stalledInfo';

interface CampaignCardProps {
  campaign: Campaign;
  magicLink: string;
  stalledInfo: StalledInfo | null;
  onPreview?: () => void;
  isPreviewActive?: boolean;
}

export function CampaignCard({
  campaign,
  magicLink,
  stalledInfo,
  onPreview,
  isPreviewActive,
}: CampaignCardProps) {
  const router = useRouter();
  const [reminderOpen, setReminderOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const showCopyButton = campaign.status !== 'draft';
  const isComplete = campaign.status === 'complete';

  return (
    <>
      <div className="hover-lift group relative rounded-[18px] border border-line bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          {/* Left: text content — entire area is a navigation link */}
          <Link
            href={`/campaigns/${campaign.id}`}
            className="min-w-0 flex-1"
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="truncate font-display text-base font-semibold tracking-tight">
                {campaign.client_name}
              </h3>
              {stalledInfo ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-amber-700 ring-1 ring-inset ring-amber-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Stalled
                </span>
              ) : (
                <StatusBadge status={campaign.status} />
              )}
            </div>
            {stalledInfo && (
              <p className="mt-0.5 text-[13px] text-amber-700">{stalledInfo.reason}</p>
            )}
            <p className="mt-1 truncate text-sm text-ink-secondary">
              {campaign.service_provided}
            </p>
            <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
              {relativeTime(campaign.created_at)}
            </p>
          </Link>

          {/* Right: action buttons */}
          <div className="flex shrink-0 items-center gap-2">
            {showCopyButton && (
              <CopyMagicLinkButton magicLink={magicLink} />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDeleteOpen(true);
              }}
              title="Delete campaign"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-muted transition-all duration-200 hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="sr-only">Delete campaign</span>
            </button>
            {stalledInfo ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReminderOpen(true);
                }}
                title="Send reminder"
                className={cn(
                  'flex h-9 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 text-[12px] font-medium text-amber-700 transition-all duration-200',
                  'hover:border-amber-300 hover:bg-amber-100'
                )}
              >
                <Bell className="h-3.5 w-3.5" />
                <span>Send reminder</span>
              </button>
            ) : isComplete ? (
              <button
                type="button"
                title={isPreviewActive ? 'Close preview' : 'Preview outputs'}
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview?.();
                }}
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-200',
                  isPreviewActive
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line text-ink-muted hover:border-ink hover:bg-ink hover:text-paper'
                )}
              >
                <Eye className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href={`/campaigns/${campaign.id}`}
                tabIndex={-1}
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-muted transition-all duration-200 group-hover:border-ink group-hover:bg-ink group-hover:text-paper"
              >
                <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {stalledInfo && (
        <SendReminderModal
          clientName={campaign.client_name}
          magicLink={magicLink}
          stalledInfo={stalledInfo}
          isOpen={reminderOpen}
          onClose={() => setReminderOpen(false)}
        />
      )}

      <DeleteCampaignModal
        clientName={campaign.client_name}
        campaignId={campaign.id}
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => router.refresh()}
      />
    </>
  );
}
