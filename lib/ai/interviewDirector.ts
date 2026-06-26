import type {
  AgencyContext,
  CaseStudyMode,
  EngagementBrief,
  StructuredMetric,
} from '@/lib/types';
import { generateText, parseJsonResponse } from './groq';

const SYSTEM_PROMPT = `You are a sharp, warm case-study interviewer running a live voice interview. After each answer you decide whether it's already concrete, or whether ONE short follow-up would pull out something more specific — ideally a number, a timeframe, or a vivid concrete detail. Only probe when it will clearly improve the case study. Never ask yes/no questions, never stack multiple questions, and keep any follow-up short and natural — the way a friendly podcast host would.`;

const PREMIUM_SYSTEM_PROMPT = `You are a sharp, warm case-study interviewer running a live voice interview for an in-depth, long-form B2B case study. You think in terms of the story/proof "blocks" the case study still needs, and after each answer you ask ONE short follow-up that fills the single most valuable missing or vague block — usually a real number, a timeframe, a concrete before/after, an implementation detail, or an operational change. You never interrogate: keep it conversational, one ask at a time, and never re-ask something the client already answered. Only probe when it will clearly add proof or story depth.`;

export interface ProbeDecision {
  probe: boolean;
  question: string | null;
}

/** The story/proof blocks a long-form case study needs, in priority order. */
const STORY_BLOCKS = [
  'before_state — what they were doing before',
  'specific_pain — the concrete friction with the old way',
  'tried_before / old_way — what they tried before this and why it fell short',
  'trigger — what made them realise something had to change',
  'implementation_detail — what was actually built/done and how it worked',
  'metric — a specific before/after number',
  'timeframe — over what period the change happened',
  'business_impact — the most important business change',
  'operational_impact — what changed in the day-to-day workflow/team',
  'quote_worthy_sentence — a vivid one-line summary of the impact',
];

/** Compact rendering of the agency-entered metrics that still need client confirmation. */
function unconfirmedMetricsBlock(metrics?: StructuredMetric[] | null): string {
  const pending = (metrics ?? []).filter((m) => m.status !== 'client_confirmed');
  if (pending.length === 0) return '';
  const lines = pending.map((m) => {
    const ba =
      m.before_value && m.after_value
        ? `: ${m.before_value} → ${m.after_value}`
        : m.before_value || m.after_value
          ? `: ${m.before_value || m.after_value}`
          : '';
    return `- ${m.name}${ba}${m.unit ? ` ${m.unit}` : ''}${m.timeframe ? ` over ${m.timeframe}` : ''}`;
  });
  return `\n\nAgency-claimed metrics still UNCONFIRMED by the client (if the current answer is about results and one of these hasn't been confirmed yet, a great follow-up is to ask them to confirm the numbers and the timeframe — never state the numbers as fact):\n${lines.join('\n')}`;
}

/**
 * Decide whether the client's last answer needs a follow-up probe. Returns the
 * probe question when one would help (e.g. turning "it saved a lot of time"
 * into "about how many hours a week?"), otherwise probe=false. Premium mode uses
 * gap-based prioritisation across the story/proof blocks above.
 */
export async function decideFollowup(args: {
  context?: AgencyContext | null;
  brief?: EngagementBrief | null;
  coreQuestion: string;
  lastAnswer: string;
  priorFollowups: number;
  /** Formatted Q&A from earlier answered turns in this interview (excludes the current answer). */
  priorAnswers?: string;
  mode?: CaseStudyMode;
  metrics?: StructuredMetric[] | null;
}): Promise<ProbeDecision> {
  const { brief, coreQuestion, lastAnswer, priorFollowups, priorAnswers, mode, metrics } = args;

  if (!lastAnswer.trim()) return { probe: false, question: null };

  const covered = priorAnswers?.trim()
    ? `\n\nFull Q&A history for this interview (every question asked and every answer given). Do NOT ask a follow-up that repeats or closely mirrors a question already asked, or that asks for a fact already present in any answer below — if the needed detail is already here, set probe=false:\n${priorAnswers.trim()}`
    : '';

  const isPremium = mode === 'premium_long_form';

  const userPrompt = isPremium
    ? `Core question asked: "${coreQuestion}"
Client's answer: "${lastAnswer}"
Follow-ups already asked on this question: ${priorFollowups}

Story/proof blocks a strong long-form case study needs (ordered by priority):
${STORY_BLOCKS.map((b) => `- ${b}`).join('\n')}${unconfirmedMetricsBlock(metrics)}${covered}

Look at the client's answer. Identify the single highest-value story/proof block that this answer touches but left vague or missing, and ask ONE short, natural follow-up to fill it. Examples of the move you make:
- result with no numbers → "Do you remember roughly what the numbers were before and after?"
- numbers with no timeframe → "Over what timeframe did that change happen?"
- "it saved us time" → "What task did that take off your team's plate day-to-day?"
- "the platform helped" → "Which part of it made the biggest difference?"
- a vague/general answer → "Can you give a specific example of what changed?"
If the answer is already specific and its key blocks are covered (or already covered above), set probe=false. Never re-ask something already answered.

Return ONLY JSON:
{ "probe": true|false, "question": "the follow-up to ask, warm and conversational, or null" }`
    : `Core question asked: "${coreQuestion}"
Client's answer: "${lastAnswer}"
Follow-ups already asked on this question: ${priorFollowups}${
        brief?.suspected_metrics?.length
          ? `\nOutcomes the consultant believes happened (worth confirming with a real number): ${brief.suspected_metrics.join('; ')}`
          : ''
      }${covered}

Is the answer specific enough (has a number, a concrete detail, or a clear story), or would ONE short follow-up meaningfully sharpen it — e.g. turning a vague "it saved a lot of time" into "roughly how many hours a week?" If they've already given a solid, specific answer, do not probe. Do not re-ask for anything already stated in "Already covered" above, even under a different question.

Return ONLY JSON:
{ "probe": true|false, "question": "the follow-up to ask, warm and conversational, or null" }`;

  const text = await generateText(
    isPremium ? PREMIUM_SYSTEM_PROMPT : SYSTEM_PROMPT,
    userPrompt,
    true
  );
  const decision = parseJsonResponse<ProbeDecision>(text);

  const probe = Boolean(decision?.probe && decision?.question);
  return { probe, question: probe ? String(decision.question) : null };
}

/**
 * Returns true if the full interview transcript already substantially answers
 * the given core question — used to skip redundant core questions at runtime.
 */
export async function isCoreQuestionCovered(
  question: string,
  fullTranscript: string
): Promise<boolean> {
  if (!fullTranscript.trim()) return false;
  const text = await generateText(
    'You are reviewing a case study interview transcript.',
    `Question: "${question}"\n\nInterview transcript so far:\n${fullTranscript}\n\nDoes the transcript already substantially answer this question — i.e., the client gave enough detail that asking it again would be redundant? Return ONLY JSON: { "covered": true|false }`,
    true
  ).catch(() => '{"covered":false}');
  const result = parseJsonResponse<{ covered: boolean }>(text);
  return Boolean(result?.covered);
}
