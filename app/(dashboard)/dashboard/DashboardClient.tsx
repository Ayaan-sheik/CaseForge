'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Plus, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CountUp } from '@/components/ui/count-up';
import { CampaignCard } from '@/components/dashboard/CampaignCard';
import { OutputTabs } from '@/components/outputs/OutputTabs';
import { getStalledInfo, type CampaignWithResponses } from '@/lib/utils/stalledInfo';
import { cn } from '@/lib/utils/cn';
import type { Campaign, CampaignStatus, Output } from '@/lib/types';

const WAVE_HEIGHTS = [10, 22, 34, 26, 40, 30, 18, 36, 24, 14];
const PAGE_SIZE = 10;

type SortDir = 'asc' | 'desc';
type StageFilter = CampaignStatus | 'all';

// Labels mirror components/dashboard/StatusBadge.tsx.
const STAGE_OPTIONS: { value: StageFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'recording', label: 'Recording' },
  { value: 'processing', label: 'Processing' },
  { value: 'complete', label: 'Complete' },
  { value: 'error', label: 'Needs attention' },
];

// `desc` = newest first (the prior default), `asc` = oldest first.
const SORT_OPTIONS: { value: SortDir; label: string }[] = [
  { value: 'desc', label: 'Newest' },
  { value: 'asc', label: 'Oldest' },
];

interface DashboardClientProps {
  campaigns: CampaignWithResponses[];
  appUrl: string;
  firstName: string | undefined;
}

export function DashboardClient({ campaigns, appUrl, firstName }: DashboardClientProps) {
  const [previewCampaignId, setPreviewCampaignId] = useState<string | null>(null);
  const [previewOutput, setPreviewOutput] = useState<Output | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // Entrance animation runs only on the initial load. Toggling the preview
  // reparents the list (in-place ⇄ portal), which remounts the cards; gating
  // the animation off after the first interaction prevents a fade-up flicker.
  const [animateIn, setAnimateIn] = useState(true);

  // Client-side search / stage filter / date sort / pagination over the already-fetched campaigns.
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  // Reset to the first page whenever the filtered/sorted view changes.
  useEffect(() => {
    setPage(1);
  }, [search, stageFilter, sortDir]);

  // Lock body scroll while the preview panel is open so the page behind doesn't drift.
  useEffect(() => {
    document.body.style.overflow = previewCampaignId ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [previewCampaignId]);

  const total = campaigns.length;
  const inFlight = campaigns.filter((c) => ['sent', 'recording', 'processing'].includes(c.status)).length;
  const complete = campaigns.filter((c) => c.status === 'complete').length;
  const previewCampaign = campaigns.find((c) => c.id === previewCampaignId) ?? null;

  // Filter by stage and search query, then sort by created date.
  const query = search.trim().toLowerCase();
  const filtered = campaigns.filter(
    (c) =>
      (stageFilter === 'all' || c.status === stageFilter) &&
      (!query || c.client_name.toLowerCase().includes(query))
  );
  const sorted = [...filtered].sort((a, b) => {
    const cmp = a.created_at.localeCompare(b.created_at);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  // Clamp during render so a shrinking result set never lands on an empty page.
  const currentPage = Math.min(page, pageCount);
  const paged = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function handlePreview(campaignId: string) {
    setAnimateIn(false);
    if (previewCampaignId === campaignId) {
      setPreviewCampaignId(null);
      setPreviewOutput(null);
      return;
    }
    setPreviewCampaignId(campaignId);
    setPreviewOutput(null);
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/outputs/${campaignId}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewOutput(data.output ?? null);
      }
    } catch {
      // silently fail — panel still shows with an empty state
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    setAnimateIn(false);
    setPreviewCampaignId(null);
    setPreviewOutput(null);
  }

  const campaignListContent = (
    <>
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Campaigns</p>
          <h1 className="mt-4 font-display text-[clamp(28px,3vw,36px)] font-semibold leading-tight tracking-[-0.025em]">
            {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
          </h1>
          <p className="mt-1.5 font-editorial italic text-[15px] text-ink-secondary">
            {total
              ? 'Every link you send is a story waiting to come back.'
              : 'Your first story is one link away.'}
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="h-4 w-4" />
            New campaign
          </Button>
        </Link>
      </div>

      {/* Stats */}
      {total > 0 && (
        <div className="mt-10 flex justify-between border-t border-line pt-8">
          {[
            { value: total, label: 'Total campaigns' },
            { value: inFlight, label: 'In flight' },
            { value: complete, label: 'Published' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`${animateIn ? 'animate-fade-up' : ''} text-center`}
              style={animateIn ? { animationDelay: `${i * 90}ms` } : undefined}
            >
              <CountUp
                value={stat.value}
                className="font-display text-[46px] font-semibold leading-none tracking-[-0.03em]"
              />
              <p className="mt-1.5 text-[15px] text-ink-secondary">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Campaign list */}
      {campaigns.length > 0 ? (
        <div className="mt-10 border-t border-line pt-8">
          <p className="eyebrow mb-6">All campaigns</p>

          {/* Search + stage/sort toolbar */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative sm:max-w-xs sm:flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by client name"
                className="pl-10"
              />
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Select
                label="Stage"
                value={stageFilter}
                options={STAGE_OPTIONS}
                onChange={setStageFilter}
                align="right"
              />
              <Select
                value={sortDir}
                options={SORT_OPTIONS}
                onChange={setSortDir}
                align="right"
              />
            </div>
          </div>

          {sorted.length === 0 ? (
            <p className="py-10 text-center text-[15px] text-ink-secondary">
              No campaigns match your filters.
            </p>
          ) : (
            <div className="space-y-3">
              {paged.map((campaign, i) => (
                <div
                  key={campaign.id}
                  className={animateIn ? 'animate-fade-up' : undefined}
                  style={
                    animateIn
                      ? { animationDelay: `${200 + Math.min(i * 70, 480)}ms` }
                      : undefined
                  }
                >
                  <CampaignCard
                    campaign={campaign as Campaign}
                    magicLink={`${appUrl}/interview/${campaign.magic_token}`}
                    stalledInfo={getStalledInfo(campaign)}
                    onPreview={
                      campaign.status === 'complete'
                        ? () => handlePreview(campaign.id)
                        : undefined
                    }
                    isPreviewActive={previewCampaignId === campaign.id}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4 border-t border-line pt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                Prev
              </Button>
              <span className="font-mono text-[12px] text-ink-muted">
                Page {currentPage} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={currentPage >= pageCount}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-scale-in mt-10 flex flex-col items-center rounded-[20px] border border-dashed border-line bg-white px-6 py-20 text-center">
          <div className="flex h-16 items-end gap-1" aria-hidden="true">
            {WAVE_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className="wave-bar w-1.5 rounded-full bg-ink/60"
                style={{ height: `${h + 8}px`, animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
          <h2 className="mt-8 font-display text-[22px] font-semibold tracking-tight">
            No campaigns yet
          </h2>
          <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-ink-secondary">
            Send a magic link to a client and their voice comes back as a finished case study — PDF,
            public page, and LinkedIn quotes included.
          </p>
          <Link href="/campaigns/new" className="mt-8">
            <Button size="lg">Create your first campaign</Button>
          </Link>
        </div>
      )}
    </>
  );

  // Normal mode: render the list in place inside the centered <main>.
  if (!previewCampaignId) {
    return <div>{campaignListContent}</div>;
  }

  /*
   * Preview mode: render the split overlay through a portal to document.body.
   * The dashboard <main> carries `animate-fade-up`, whose `forwards` fill leaves
   * a non-`none` transform — that makes <main> the containing block for any
   * `position: fixed` descendant, collapsing this overlay to a sliver. Portaling
   * to <body> escapes that ancestor so `fixed` resolves against the viewport.
   */
  const overlay = (
    <div className="fixed inset-x-4 bottom-0 top-[68px] z-30 flex overflow-hidden border-t border-line bg-paper shadow-2xl">
      {/* Left: campaign list — independently scrollable */}
      <div className="min-w-0 flex-1 overflow-y-auto px-7 py-10">
        {campaignListContent}
      </div>

      {/* Right: preview panel */}
      <div className="flex w-[500px] shrink-0 flex-col border-l border-line bg-paper">
        {/* Panel header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              Preview
            </p>
            {previewCampaign && (
              <p className="mt-0.5 truncate font-display text-[14px] font-semibold text-ink">
                {previewCampaign.client_name}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={closePreview}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close preview</span>
          </button>
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto p-5">
          {previewLoading && (
            <div className="space-y-4">
              {[80, 48, 64, 48].map((h, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl bg-subtle"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
          )}
          {!previewLoading && previewOutput && (
            <OutputTabs output={previewOutput} appUrl={appUrl} />
          )}
          {!previewLoading && !previewOutput && (
            <div className="flex h-40 items-center justify-center text-center">
              <p className="text-[14px] text-ink-secondary">
                No outputs found for this campaign.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(overlay, document.body);
}
