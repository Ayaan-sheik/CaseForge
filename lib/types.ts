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

export interface Campaign {
  id: string;
  creator_id: string;
  client_name: string;
  service_provided: string;
  status: CampaignStatus;
  magic_token: string;
  questions: Question[] | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResponseRow {
  id: string;
  campaign_id: string;
  question_id: string;
  audio_url: string | null;
  transcript_raw: string | null;
  transcript_clean: string | null;
  assemblyai_id: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface LinkedInQuote {
  quote: string;
  context: string;
}

export interface Output {
  id: string;
  campaign_id: string;
  case_study_title: string | null;
  case_study_summary: string | null;
  case_study_challenge: string | null;
  case_study_solution: string | null;
  case_study_results: string | null;
  testimonial_quote: string | null;
  linkedin_quotes: LinkedInQuote[] | null;
  pdf_url: string | null;
  web_slug: string | null;
  created_at: string;
}

export interface SynthesisResult {
  title: string;
  summary: string;
  challenge: string;
  solution: string;
  results: string;
  testimonial_quote: string;
  linkedin_quotes: LinkedInQuote[];
}

export interface Profile {
  id: string;
  full_name: string | null;
  company_name: string | null;
  created_at: string;
}
