import type { Campaign } from '@/lib/types';

export interface CampaignWithResponses extends Campaign {
  responses: { id: string; duration_seconds: number | null; audio_url: string | null }[];
}

export interface StalledInfo {
  label: string;
  reason: string;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SHORT_AUDIO_THRESHOLD_S = 10; // avg seconds per question

export function getStalledInfo(campaign: CampaignWithResponses): StalledInfo | null {
  const updatedAt = new Date(campaign.updated_at).getTime();
  const now = Date.now();

  if (campaign.status === 'sent' && now - updatedAt > THREE_DAYS_MS) {
    return { label: 'Stalled', reason: 'Link unopened for 3 days' };
  }

  // Only count *answered* turns — the interview seeds an unanswered "pending"
  // row for the current question, which has no audio yet.
  const recorded = campaign.responses.filter((r) => r.audio_url);

  if (campaign.status === 'recording' && recorded.length === 0 && now - updatedAt > ONE_DAY_MS) {
    return { label: 'Stalled', reason: 'Link opened, but no audio recorded' };
  }

  if (
    campaign.status !== 'complete' &&
    campaign.status !== 'draft' &&
    recorded.length > 0
  ) {
    const durations = recorded
      .map((r) => r.duration_seconds)
      .filter((d): d is number => d !== null);
    if (durations.length > 0) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      if (avg < SHORT_AUDIO_THRESHOLD_S) {
        return { label: 'Stalled', reason: 'Audio too short' };
      }
    }
  }

  return null;
}
