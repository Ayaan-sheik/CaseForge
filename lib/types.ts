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

/**
 * Case-study depth mode (campaign-level). `standard` keeps the current
 * low-friction interview + synthesis; `premium_long_form` collects deeper
 * creator context and runs a longer interview to support a 4-6 page case study.
 */
export type CaseStudyMode = 'standard' | 'premium_long_form';

/** Trust level of a structured metric — agency claims are unverified until the client confirms. */
export type MetricStatus = 'agency_claimed' | 'client_confirmed' | 'unverified';

/** Where a structured metric value came from. */
export type MetricSource = 'campaign_builder' | 'client_interview' | 'synthesis';

/**
 * A structured before/after metric attached to a campaign (`campaigns.metrics`).
 * Entered by the agency in the builder (`agency_claimed`), then confirmed or
 * corrected by the client interview. Percentage/contradiction math is computed
 * in code (never the LLM) before synthesis/rendering.
 */
export interface StructuredMetric {
  name: string;
  before_value?: string;
  after_value?: string;
  unit?: string;
  timeframe?: string;
  status: MetricStatus;
  source?: MetricSource;
}

/**
 * A structured metric enriched with code-computed math (never LLM-computed).
 * Produced by `validateMetrics`; consumed by synthesis (Phase 4) + the PDF
 * (Phase 5) so percentages are always deterministic and trustworthy.
 */
export interface ValidatedMetric extends StructuredMetric {
  /** Parsed numeric value of `before_value` (commas/currency/k-m suffix stripped). */
  before_number?: number;
  /** Parsed numeric value of `after_value`. */
  after_number?: number;
  /** after_number - before_number, when both parse. */
  absolute_change?: number;
  /** Code-computed percentage change (1-decimal). Omitted when before is 0/unknown. */
  percent_change?: number;
  direction?: 'increase' | 'decrease' | 'unchanged' | 'unknown';
  /** Human-readable notes: computed change, confirmation, corrections, contradictions. */
  validation_notes?: string[];
}

/** A raw metric signal the story extractor pulled from the client transcript. */
export interface MetricObservation {
  name: string;
  before_value?: string;
  after_value?: string;
  unit?: string;
  timeframe?: string;
  /** The client explicitly stated/confirmed this metric in the interview. */
  client_stated?: boolean;
  /** The client corrected an agency-claimed value. */
  corrected?: boolean;
  note?: string;
}

/** A verbatim quote pulled from the transcript, with optional attribution + theme. */
export interface QuoteCandidate {
  quote: string;
  /** Speaker name, if stated. */
  speaker?: string;
  /** Speaker role/title, if stated. */
  role?: string;
  /** Which story block it best supports (e.g. "operational_impact"). */
  theme?: string;
}

/**
 * Grounded, structured story material extracted from brief + premium fields +
 * metrics + transcript, BEFORE final synthesis. The synthesizer writes from
 * these blocks (Phase 4) rather than the raw transcript, so long-form sections
 * stay specific. Invents nothing — empty/missing fields are flagged.
 */
export interface StoryBlocks {
  client_background?: string;
  before_state?: string;
  pain_points?: string[];
  tried_before?: string;
  trigger_for_change?: string;
  why_chose_provider?: string;
  implementation_summary?: string;
  implementation_components?: string[];
  workflow_change?: string;
  operational_impact?: string;
  business_impact?: string;
  /** Raw metric signals from the transcript (LLM). Validation turns these numeric. */
  metric_observations?: MetricObservation[];
  /** Code-validated metrics the client confirmed (filled after validateMetrics). */
  confirmed_metrics?: ValidatedMetric[];
  /** Code-validated metrics still unconfirmed/agency-claimed (filled after validateMetrics). */
  unconfirmed_metrics?: ValidatedMetric[];
  quote_candidates?: QuoteCandidate[];
  key_outcomes?: string[];
  strategic_takeaway?: string;
  missing_context_flags?: string[];
  evidence_notes?: string[];
}

export type SufficiencyLevel = 'strong' | 'medium' | 'weak' | 'missing';

/** The nine scored dimensions that gate long-form depth. */
export interface SufficiencyDimensions {
  metrics_strength: SufficiencyLevel;
  before_state_detail: SufficiencyLevel;
  pain_specificity: SufficiencyLevel;
  implementation_detail: SufficiencyLevel;
  operational_impact: SufficiencyLevel;
  quote_quality: SufficiencyLevel;
  timeline_availability: SufficiencyLevel;
  client_background: SufficiencyLevel;
  proof_confidence: SufficiencyLevel;
}

/**
 * Deterministic content-sufficiency score. Decides how deep the long-form case
 * study should be — long-form is earned by the data, never padded to a page
 * count. Computed in code from StoryBlocks + ValidatedMetric[].
 */
export interface ContentSufficiency {
  overall: 'strong' | 'medium' | 'weak';
  recommended_depth: 'short' | 'medium' | 'long';
  recommended_pages: { min: number; max: number };
  dimensions: SufficiencyDimensions;
  reasons: string[];
  missing_context_flags: string[];
}

/** Engagement brief captured in the conversational campaign builder. */
export interface EngagementBrief {
  problem: string;
  what_delivered: string;
  what_changed: string;
  /** Outcome/number claims the creator believes happened — probed in the interview. */
  suspected_metrics: string[];

  // ── Premium long-form fields (optional; collected only in premium_long_form
  //    mode). Stored verbatim — they ground deeper interview questions and a
  //    richer story, never inventing facts. ──
  /** What the client was doing before the engagement. */
  before_state?: string;
  /** What the client had already tried before working with the provider. */
  tried_before?: string;
  /** The main components/steps the provider implemented (multi-item). */
  implementation_components?: string[];
  /** The single most important business change after the work. */
  key_business_change?: string;
  /** Results/metrics the interview should try to verify with the client. */
  expected_results_to_verify?: string;
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
  /** Depth mode — controls collection depth, interview length, and synthesis. */
  case_study_mode: CaseStudyMode;
  /** Structured before/after metrics (agency-claimed until the interview confirms). */
  metrics: StructuredMetric[];
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
  /** Phase 3 intermediate artifacts (persisted for synthesis reuse + no-LLM re-render). */
  story_blocks?: StoryBlocks | null;
  validated_metrics?: ValidatedMetric[] | null;
  content_sufficiency?: ContentSufficiency | null;
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
