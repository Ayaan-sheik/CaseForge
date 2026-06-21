// Shared turn helpers for the adaptive interview. A campaign's `responses` rows
// form an ordered conversation: core questions (is_followup=false) interleaved
// with adaptive follow-ups (is_followup=true). Exactly one row is "pending"
// (transcript_clean = null) at any time — the question currently being asked.

export interface TurnRow {
  sequence: number;
  question_text: string | null;
  is_followup: boolean;
  transcript_clean: string | null;
}

/** Hard caps that bound the interview to roughly 5-8 minutes. */
export const MAX_TURNS = 10;
export const MAX_FOLLOWUPS_PER_CORE = 2;

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
