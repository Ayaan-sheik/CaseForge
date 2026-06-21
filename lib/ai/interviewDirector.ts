import type { AgencyContext, EngagementBrief } from '@/lib/types';
import { generateText, parseJsonResponse } from './groq';

const SYSTEM_PROMPT = `You are a sharp, warm case-study interviewer running a live voice interview. After each answer you decide whether it's already concrete, or whether ONE short follow-up would pull out something more specific — ideally a number, a timeframe, or a vivid concrete detail. Only probe when it will clearly improve the case study. Never ask yes/no questions, never stack multiple questions, and keep any follow-up short and natural — the way a friendly podcast host would.`;

export interface ProbeDecision {
  probe: boolean;
  question: string | null;
}

/**
 * Decide whether the client's last answer needs a follow-up probe. Returns the
 * probe question when one would help (e.g. turning "it saved a lot of time"
 * into "about how many hours a week?"), otherwise probe=false.
 */
export async function decideFollowup(args: {
  context?: AgencyContext | null;
  brief?: EngagementBrief | null;
  coreQuestion: string;
  lastAnswer: string;
  priorFollowups: number;
}): Promise<ProbeDecision> {
  const { brief, coreQuestion, lastAnswer, priorFollowups } = args;

  if (!lastAnswer.trim()) return { probe: false, question: null };

  const metrics = brief?.suspected_metrics?.length
    ? `\nOutcomes the consultant believes happened (worth confirming with a real number): ${brief.suspected_metrics.join('; ')}`
    : '';

  const userPrompt = `Core question asked: "${coreQuestion}"
Client's answer: "${lastAnswer}"
Follow-ups already asked on this question: ${priorFollowups}${metrics}

Is the answer specific enough (has a number, a concrete detail, or a clear story), or would ONE short follow-up meaningfully sharpen it — e.g. turning a vague "it saved a lot of time" into "roughly how many hours a week?" If they've already given a solid, specific answer, do not probe.

Return ONLY JSON:
{ "probe": true|false, "question": "the follow-up to ask, warm and conversational, or null" }`;

  const text = await generateText(SYSTEM_PROMPT, userPrompt, true);
  const decision = parseJsonResponse<ProbeDecision>(text);

  const probe = Boolean(decision?.probe && decision?.question);
  return { probe, question: probe ? String(decision.question) : null };
}
