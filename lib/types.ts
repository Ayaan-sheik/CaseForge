export interface Question {
  id: string;
  text: string;
}

export type CampaignStatus =
  | 'draft'
  | 'sent'
  | 'recording'
  | 'processing'
  | 'complete'
  | 'error';

/** Engagement brief captured in the conversational campaign builder. */
export interface EngagementBrief {
  problem: string;
  what_delivered: string;
  what_changed: string;
  /** Outcome/number claims the creator believes happened — probed in the interview. */
  suspected_metrics: string[];
}

export interface Campaign {
  id: string;
  creator_id: string;
  client_name: string;
  service_provided: string;
  client_industry: string | null;
  client_size: string | null;
  /** Client city/region (creator-supplied, optional) — feeds the case-study snapshot. */
  client_location: string | null;
  /** Engagement duration (creator-supplied, optional) — feeds the case-study snapshot. */
  timeline: string | null;
  brief: EngagementBrief | null;
  status: CampaignStatus;
  magic_token: string;
  questions: Question[] | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/** One interview turn: a core question or an adaptive follow-up + its answer. */
export interface ResponseRow {
  id: string;
  campaign_id: string;
  sequence: number;
  question_text: string | null;
  is_followup: boolean;
  question_id: string | null;
  audio_url: string | null;
  transcript_raw: string | null;
  transcript_clean: string | null;
  assemblyai_id: string | null;
  duration_seconds: number | null;
  created_at: string;
}

/** A before → after metric row (used in both the snapshot and results table). */
export interface BeforeAfter {
  metric: string;
  before: string;
  after: string;
}

/** A verbatim client quote with attribution. */
export interface ClientQuote {
  quote: string;
  name: string;
  title: string;
}

/**
 * One story section of the long-form case study: a narrative heading, one or
 * more qualitative paragraphs, and an optional verbatim pull quote.
 */
export interface NarrativeSection {
  /** Story-like section title, e.g. "The Challenge: Stuck in the Shared-Lead Trap". */
  heading: string;
  /** 2-4 qualitative paragraphs of narrative prose. */
  body: string[];
  /** Optional verbatim client quote embedded in the section. */
  quote?: ClientQuote;
}

/**
 * The fixed 9-section case study (stored as `outputs.case_study` jsonb).
 * Any field with no supporting source data holds an exact `[NEEDS INPUT: …]`
 * flag rather than invented content; renderers omit unfilled fields publicly.
 */
export interface CaseStudy {
  // §1 Header
  client_name: string;
  /** Industry + company size, e.g. "SaaS · ~50 employees". */
  industry_size: string;
  /** One-line headline result — the single most impressive outcome. */
  headline_result: string;
  // §2 Snapshot — 3-4 before→after stat bullets (fewer if data is thin).
  snapshot: BeforeAfter[];
  // §3 The challenge (100-150 words) with a concrete trigger event.
  challenge: string;
  // §4 Why they chose the provider (50-80 words).
  why_chose: string;
  /** Provider/agency name (from the creator's company_name). */
  provider_name: string;
  // §5 What we did — numbered action steps pulled from the transcript.
  what_we_did: string[];
  // §6 The results — Metric | Before | After table rows.
  results: BeforeAfter[];
  // §7 Client quote(s) — up to 3 verbatim quotes with attribution.
  quotes: ClientQuote[];
  // §8 Timeline — one line; empty if not stated in source.
  timeline: string;
  // §9 CTA — provider contact/link placeholder.
  cta: string;

  // ── Long-form / story fields (optional, additive). The short-form renders a
  // condensed subset of the same content; the long-form uses the full narrative. ──
  /** Client Snapshot row — city/region; empty if not stated. */
  location?: string;
  /** Client Snapshot row — team/company size in words; empty if not stated. */
  team_size?: string;
  /** Long-form "The Results" intro bullets — qualitative key outcomes. */
  key_outcomes?: string[];
  /** Ordered story body for the long-form (challenge → strategy → transformation …). */
  narrative_sections?: NarrativeSection[];
  /** Short-form closing narrative ("The Transformation"). */
  transformation?: string;
  /** Long-form closing narrative ("Conclusion"). */
  conclusion?: string;
}

export interface Output {
  id: string;
  campaign_id: string;
  case_study: CaseStudy | null;
  /** Short-form one-pager PDF URL. */
  pdf_url: string | null;
  /** Long-form (~5-page) story PDF URL. */
  pdf_url_long: string | null;
  web_slug: string | null;
  created_at: string;
}

/** Global agency context captured at onboarding, editable in Settings. */
export interface AgencyContext {
  what_you_do: string;
  icp: string;
  services: string[];
  differentiator: string;
  typical_outcomes: string;
  tone: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  company_name: string | null;
  context: AgencyContext | null;
  onboarding_complete: boolean;
  created_at: string;
}
