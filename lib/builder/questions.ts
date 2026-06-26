// Campaign-builder question set (creator answering about the engagement).
// Server-import-free so it can be shared with the client builder UI.

import type { CaseStudyMode } from '@/lib/types';

export interface BuilderQuestion {
  key: string;
  prompt: string;
  placeholder: string;
  /** Short single-line answer vs. a narrative paragraph. */
  short?: boolean;
  /** Skippable — the creator can leave it blank (the field is then omitted). */
  optional?: boolean;
  /**
   * Input style. 'text' (default) = single field; 'list' = a multi-line field
   * where each line becomes one item (used for implementation_components).
   */
  inputStyle?: 'text' | 'list';
}

export const BUILDER_QUESTIONS: BuilderQuestion[] = [
  {
    key: 'client_name',
    prompt: "Who's this case study about? The client or company name.",
    placeholder: 'Acme Inc.',
    short: true,
  },
  {
    key: 'client_industry',
    prompt: 'What industry are they in?',
    placeholder: 'e.g. SaaS, ecommerce, healthcare',
    short: true,
  },
  {
    key: 'client_size',
    prompt: 'Roughly how big are they? Team size or revenue is fine.',
    placeholder: 'e.g. 20 employees, ~$3M ARR',
    short: true,
  },
  {
    key: 'client_location',
    prompt: 'Where are they based? (Optional — helps localize the story.)',
    placeholder: 'e.g. Austin, TX',
    short: true,
    optional: true,
  },
  {
    key: 'timeline',
    prompt: 'Roughly how long did the engagement run? (Optional.)',
    placeholder: 'e.g. 3 months, ongoing since Jan 2025',
    short: true,
    optional: true,
  },
  {
    key: 'problem',
    prompt: 'What was going on before you stepped in — the problem they had?',
    placeholder: 'e.g. Their email list was huge but barely driving any revenue.',
  },
  {
    key: 'what_delivered',
    prompt: 'What did you actually do for them?',
    placeholder: 'e.g. Rebuilt all their Klaviyo flows and ran weekly campaigns.',
  },
  {
    key: 'what_changed',
    prompt: 'What changed as a result? Any numbers you know of are great.',
    placeholder: 'e.g. Email went from 8% to 32% of revenue in 3 months.',
  },
];

/**
 * Extra creator questions for premium long-form mode. These deepen the source
 * material (real before-state, prior attempts, concrete implementation, business
 * impact, metrics to verify) so the long-form case study has substance rather
 * than padding. All optional — recommended but skippable to keep friction low.
 * Stored on the engagement `brief`.
 */
export const PREMIUM_BUILDER_QUESTIONS: BuilderQuestion[] = [
  {
    key: 'before_state',
    prompt: 'What was the client doing before working with you?',
    placeholder: 'e.g. Posting sporadically, the office manager handled social by hand.',
    optional: true,
  },
  {
    key: 'tried_before',
    prompt: 'What had they already tried before working with you?',
    placeholder: 'e.g. A freelancer and a scheduling tool — neither stuck.',
    optional: true,
  },
  {
    key: 'implementation_components',
    prompt: 'What exactly did you implement? List the main components or steps — one per line.',
    placeholder: 'Daily content calendar\nAutomated scheduling\nLocal hashtag targeting\nReporting dashboard',
    optional: true,
    inputStyle: 'list',
  },
  {
    key: 'key_business_change',
    prompt: 'What was the most important business change after the work?',
    placeholder: 'e.g. Social became a real channel into the shop, not just posting.',
    optional: true,
  },
  {
    key: 'expected_results_to_verify',
    prompt: 'What results or metrics should the interview try to verify?',
    placeholder: 'e.g. Followers 4k → 20k, daily views 10k → 50k, revenue lift over ~2 months.',
    optional: true,
  },
];

/** The builder question set for a given mode (premium appends the deeper fields). */
export function builderQuestionsForMode(mode: CaseStudyMode): BuilderQuestion[] {
  return mode === 'premium_long_form'
    ? [...BUILDER_QUESTIONS, ...PREMIUM_BUILDER_QUESTIONS]
    : BUILDER_QUESTIONS;
}
