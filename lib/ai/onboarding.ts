import type { AgencyContext } from '@/lib/types';
import { ONBOARDING_QUESTIONS } from '@/lib/onboarding/questions';
import { generateText, parseJsonResponse } from './groq';

const SYSTEM_PROMPT = `You structure a consultant's onboarding answers into a clean context profile that will brief later AI steps (question generation and case-study writing). You NEVER invent facts — only organize and lightly tidy what they actually said. Preserve any numbers verbatim. The confirmation summary should be warm, concise, and addressed to the user as "you".`;

export interface OnboardingResult {
  context: AgencyContext;
  summary: string;
}

/**
 * Turn the raw onboarding Q&A into a structured AgencyContext plus a short
 * reflect-it-back summary the user confirms. Single Groq call (chat tier).
 */
export async function summarizeContext(
  answers: Record<string, string>
): Promise<OnboardingResult> {
  const qa = ONBOARDING_QUESTIONS.map(
    (q) => `Q: ${q.prompt}\nA: ${answers[q.key]?.trim() || '(skipped)'}`
  ).join('\n\n');

  const userPrompt = `Here are the consultant's onboarding answers:

${qa}

Return ONLY a JSON object (no markdown, no preamble):
{
  "context": {
    "what_you_do": "one clear sentence",
    "icp": "their ideal client in one line",
    "services": ["service", "service"],
    "differentiator": "one line — what sets them apart",
    "typical_outcomes": "one line; keep any numbers exactly as stated",
    "tone": "a few words describing the desired voice"
  },
  "summary": "2-3 warm sentences reflecting back what they do, so they can confirm we understood. Address them as 'you'."
}`;

  const text = await generateText(SYSTEM_PROMPT, userPrompt, true);
  const parsed = parseJsonResponse<OnboardingResult>(text);

  if (!parsed?.context || typeof parsed.summary !== 'string') {
    throw new Error('AI returned a malformed onboarding result');
  }
  if (!Array.isArray(parsed.context.services)) {
    parsed.context.services = [];
  }

  return parsed;
}
