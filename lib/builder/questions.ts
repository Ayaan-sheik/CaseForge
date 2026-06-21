// Campaign-builder question set (creator answering about the engagement).
// Server-import-free so it can be shared with the client builder UI.

export interface BuilderQuestion {
  key: string;
  prompt: string;
  placeholder: string;
  /** Short single-line answer vs. a narrative paragraph. */
  short?: boolean;
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
