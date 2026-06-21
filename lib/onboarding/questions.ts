// Onboarding question set — kept free of server imports so it can be shared
// between the client onboarding UI and the server-side structuring prompt.

export interface OnboardingQuestion {
  key: string;
  /** What the assistant "asks" in the chat UI. */
  prompt: string;
  placeholder: string;
}

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    key: 'what_you_do',
    prompt: "First up — what does your business actually do? A sentence or two is plenty.",
    placeholder: 'e.g. We run done-for-you email marketing for DTC ecommerce brands.',
  },
  {
    key: 'icp',
    prompt: "Who's your ideal client? Industry, size, the kind of company you do your best work for.",
    placeholder: 'e.g. 7-figure Shopify brands, 10–50 staff, in beauty & wellness.',
  },
  {
    key: 'services',
    prompt: 'What do you typically deliver? List the main services or offers.',
    placeholder: 'e.g. Klaviyo setup, automated flows, weekly campaigns, list growth.',
  },
  {
    key: 'differentiator',
    prompt: 'What makes you different from the alternatives your clients consider?',
    placeholder: "e.g. We work on revenue-share, so we only win when they do.",
  },
  {
    key: 'typical_outcomes',
    prompt: 'What results do you usually get clients? Any typical numbers here are gold.',
    placeholder: 'e.g. 25–40% of total revenue coming from email within 90 days.',
  },
  {
    key: 'tone',
    prompt: 'Last one — how should your case studies sound? Your brand voice.',
    placeholder: 'e.g. Direct, no fluff, a little irreverent.',
  },
];
