import type { EngagementBrief } from '@/lib/types';
import { generateText, parseJsonResponse } from './groq';

const SYSTEM_PROMPT = `You structure a consultant's notes about a client engagement into a clean brief that will guide a case-study interview. You NEVER invent facts — only organize what they said. Preserve every number, percentage, and dollar amount exactly. Pull out any outcome/number claims into "suspected_metrics" so they can be confirmed by the client later.`;

/**
 * Turn the builder's narrative answers (problem / what was delivered / what
 * changed) into a structured EngagementBrief. Single Groq call (chat tier).
 */
export async function summarizeBrief(
  answers: Record<string, string>
): Promise<EngagementBrief> {
  const userPrompt = `Here is what the consultant said about the engagement:

Problem before: ${answers.problem?.trim() || '(not given)'}
What they delivered: ${answers.what_delivered?.trim() || '(not given)'}
What changed: ${answers.what_changed?.trim() || '(not given)'}

Return ONLY a JSON object (no markdown, no preamble):
{
  "problem": "1-2 sentences on the client's situation before, in the consultant's framing",
  "what_delivered": "1-2 sentences on what was actually done",
  "what_changed": "1-2 sentences on the result; keep numbers verbatim",
  "suspected_metrics": ["each concrete or claimed outcome/number the client should confirm, e.g. 'email went from 8% to 32% of revenue'"]
}`;

  const text = await generateText(SYSTEM_PROMPT, userPrompt, true);
  const brief = parseJsonResponse<EngagementBrief>(text);

  if (!brief || typeof brief.problem !== 'string') {
    throw new Error('AI returned a malformed brief');
  }
  if (!Array.isArray(brief.suspected_metrics)) {
    brief.suspected_metrics = [];
  }

  return brief;
}
