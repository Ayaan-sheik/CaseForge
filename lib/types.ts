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

/** A single big-number stat in the results band. */
export interface CaseStudyStat {
  value: string;
  label: string;
}

/** The full 9-section case study (stored as `outputs.case_study` jsonb). */
export interface CaseStudy {
  title: string;
  snapshot: {
    industry: string;
    size: string;
    headline_metric: string;
  };
  exec_summary: string;
  problem: string;
  solution: string;
  results: {
    stats: CaseStudyStat[];
    prose: string;
  };
  /** Verbatim client quotes (never paraphrased). Used for the quote cards. */
  pull_quotes: string[];
  about_company: string;
  cta: string;
}

export interface Output {
  id: string;
  campaign_id: string;
  case_study: CaseStudy | null;
  pdf_url: string | null;
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
