// Shared turn helpers for the adaptive interview. A campaign's `responses` rows
// form an ordered conversation: core questions (is_followup=false) interleaved
// with adaptive follow-ups (is_followup=true). Exactly one row is "pending"
// (transcript_clean = null) at any time — the question currently being asked.

import type { CaseStudyMode } from '@/lib/types';

export interface TurnRow {
  sequence: number;
  question_text: string | null;
  is_followup: boolean;
  transcript_clean: string | null;
}

/** Standard hard caps — bound the interview to roughly 5-8 minutes. */
export const MAX_TURNS = 10;
export const MAX_FOLLOWUPS_PER_CORE = 2;

/**
 * Premium long-form caps — a longer interview (~10-15 min) to collect enough
 * story depth for a 4-6 page case study. More core areas + one extra follow-up.
 */
export const PREMIUM_MAX_TURNS = 15;
export const PREMIUM_MAX_FOLLOWUPS_PER_CORE = 3;

/** The turn/follow-up caps for a campaign's depth mode. */
export function capsForMode(mode: CaseStudyMode | null | undefined): {
  maxTurns: number;
  maxFollowupsPerCore: number;
} {
  return mode === 'premium_long_form'
    ? { maxTurns: PREMIUM_MAX_TURNS, maxFollowupsPerCore: PREMIUM_MAX_FOLLOWUPS_PER_CORE }
    : { maxTurns: MAX_TURNS, maxFollowupsPerCore: MAX_FOLLOWUPS_PER_CORE };
}

/**
 * 1-based core-question number a row belongs to. Core questions get their own
 * number; follow-ups inherit the number of the core they follow.
 */
export function coreNumberFor(rows: TurnRow[], row: TurnRow): number {
  const coresBefore = rows.filter(
    (t) => !t.is_followup && t.sequence < row.sequence
  ).length;
  return coresBefore + (row.is_followup ? 0 : 1);
}
