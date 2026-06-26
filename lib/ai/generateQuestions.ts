import type {
  AgencyContext,
  CaseStudyMode,
  EngagementBrief,
  Question,
  StructuredMetric,
} from '@/lib/types';
import { generateText, parseJsonResponse } from './groq';

const SYSTEM_PROMPT = `You are an expert B2B case study interviewer. You write a short set of core questions that extract specific, metric-driven, story-shaped answers from a client who will answer out loud. Your questions are conversational and easy to answer by voice. You never ask yes/no questions. You ground each question in the specific engagement — referencing what was actually done — rather than asking generically.`;

/** Compact, prompt-friendly rendering of the optional agency context + brief. */
function contextBlock(context?: AgencyContext | null, brief?: EngagementBrief | null): string {
  const lines: string[] = [];
  if (context) {
    lines.push(`The consultant: ${context.what_you_do}`);
    if (context.services?.length) lines.push(`Their services: ${context.services.join(', ')}`);
  }
  if (brief) {
    lines.push(`Client's problem before: ${brief.problem}`);
    lines.push(`What was delivered: ${brief.what_delivered}`);
    lines.push(`What reportedly changed: ${brief.what_changed}`);
    if (brief.suspected_metrics?.length) {
      lines.push(`Outcomes to confirm: ${brief.suspected_metrics.join('; ')}`);
    }
  }
  return lines.join('\n');
}

/** Render the agency-entered structured metrics as confirm-me lines (premium). */
function metricsBlock(metrics?: StructuredMetric[] | null): string {
  if (!metrics?.length) return '';
  const lines = metrics.map((m) => {
    const beforeAfter =
      m.before_value && m.after_value
        ? `: ${m.before_value} → ${m.after_value}`
        : m.before_value || m.after_value
          ? `: ${m.before_value || m.after_value}`
          : '';
    const unit = m.unit ? ` ${m.unit}` : '';
    const tf = m.timeframe ? ` over ${m.timeframe}` : '';
    return `- ${m.name}${beforeAfter}${unit}${tf}`;
  });
  return `Structured metrics the consultant entered (UNCONFIRMED — the client must verify or correct them):\n${lines.join('\n')}`;
}

/** The premium context block: the standard block plus the deeper brief fields + metrics. */
function premiumContextBlock(
  context?: AgencyContext | null,
  brief?: EngagementBrief | null,
  metrics?: StructuredMetric[] | null
): string {
  const parts: string[] = [];
  const base = contextBlock(context, brief);
  if (base) parts.push(base);
  if (brief) {
    if (brief.before_state) parts.push(`Before state (provider's account): ${brief.before_state}`);
    if (brief.tried_before) parts.push(`What they had already tried: ${brief.tried_before}`);
    if (brief.implementation_components?.length) {
      parts.push(`What was implemented (components): ${brief.implementation_components.join('; ')}`);
    }
    if (brief.key_business_change) {
      parts.push(`Most important business change: ${brief.key_business_change}`);
    }
    if (brief.expected_results_to_verify) {
      parts.push(`Results the interview should verify: ${brief.expected_results_to_verify}`);
    }
  }
  const mb = metricsBlock(metrics);
  if (mb) parts.push(mb);
  return parts.join('\n');
}

/** Call the model, parse, and validate the question set (shared by both modes). */
async function runQuestionPrompt(userPrompt: string, minQuestions: number): Promise<Question[]> {
  const text = await generateText(SYSTEM_PROMPT, userPrompt, true);
  const { questions } = parseJsonResponse<{ questions: Question[] }>(text);

  if (
    !Array.isArray(questions) ||
    questions.length < minQuestions ||
    questions.some((q) => !q?.id || !q?.text)
  ) {
    throw new Error('AI returned malformed questions');
  }

  return questions;
}

/**
 * Generate the core interview questions for a campaign, grounded in the agency's
 * global context and the engagement brief. Standard mode keeps the lean 4-5
 * question set; premium long-form mode produces 6-8 story-block questions using
 * the deeper brief fields + structured metrics. Adaptive follow-ups are handled
 * separately during the interview.
 */
export async function generateQuestions(
  clientName: string,
  serviceProvided: string,
  context?: AgencyContext | null,
  brief?: EngagementBrief | null,
  mode: CaseStudyMode = 'standard',
  metrics?: StructuredMetric[] | null
): Promise<Question[]> {
  if (mode === 'premium_long_form') {
    return generatePremiumQuestions(clientName, serviceProvided, context, brief, metrics);
  }

  const ctx = contextBlock(context, brief);

  const userPrompt = `Generate the core interview questions for a case study about ${clientName}.
Service provided: ${serviceProvided}
${ctx ? `\nEngagement context:\n${ctx}\n` : ''}
Write 4-5 questions that together cover:
- the situation/pain before working together
- what changed and the single most quantifiable outcome (push for a number)
- how it fit into their day-to-day / what it felt like
- whether they'd recommend it and why

Make each question specific to THIS engagement (reference what was delivered). Keep each under 25 words. Sound like a friendly podcast host, not a corporate survey. Never ask a yes/no question.

Return ONLY a JSON object:
{
  "questions": [
    { "id": "q1", "text": "..." },
    { "id": "q2", "text": "..." }
  ]
}`;

  return runQuestionPrompt(userPrompt, 3);
}

/** Premium long-form question set — 6-8 questions walking the full story arc. */
async function generatePremiumQuestions(
  clientName: string,
  serviceProvided: string,
  context?: AgencyContext | null,
  brief?: EngagementBrief | null,
  metrics?: StructuredMetric[] | null
): Promise<Question[]> {
  const ctx = premiumContextBlock(context, brief, metrics);
  const hasMetrics = Boolean(metrics?.length) || Boolean(brief?.suspected_metrics?.length);

  const userPrompt = `Generate the core interview questions for an in-depth, long-form B2B case study about ${clientName}.
Service provided: ${serviceProvided}
${ctx ? `\nEngagement context:\n${ctx}\n` : ''}
Write 6-8 questions that walk through the full story. In a natural order, cover the beats that the context above supports:
- the before state — what they were doing before this work
- the specific pain or friction with that old way
- what made them realise something had to change (the trigger / why now)
- what they had already tried before this, and why it wasn't enough
- why they chose this provider/solution over the alternatives
- what was actually implemented, and what that process was like for them
- what changed in their day-to-day workflow, their team, or operations
- the measurable results — push for specific numbers AND the timeframe
- a one-sentence summary of the impact (a quote-worthy line)
- what they'd tell another business weighing this up

Rules:
- Make each question specific to THIS engagement — reference what was actually delivered/implemented.${
    hasMetrics
      ? `\n- Include ONE question that asks the client to confirm or correct the specific metrics above and pin down the timeframe — e.g. "The team mentioned followers grew from 4,000 to 20,000 — does that match what you saw, and over what timeframe?" Never assert the numbers as fact; ask them to verify.`
      : ''
  }
- Keep each question conversational and easy to answer out loud — a friendly podcast host, not a survey. Under 30 words each. Never ask a yes/no question.
- One clear ask per question — never stack two questions into one.

Return ONLY a JSON object:
{
  "questions": [
    { "id": "q1", "text": "..." },
    { "id": "q2", "text": "..." }
  ]
}`;

  return runQuestionPrompt(userPrompt, 5);
}

/** Regenerate a single core question, keeping it distinct from the others. */
export async function regenerateQuestion(
  clientName: string,
  serviceProvided: string,
  questionId: string,
  existingQuestions: Question[],
  context?: AgencyContext | null,
  brief?: EngagementBrief | null,
  mode: CaseStudyMode = 'standard',
  metrics?: StructuredMetric[] | null
): Promise<Question> {
  const ctx =
    mode === 'premium_long_form'
      ? premiumContextBlock(context, brief, metrics)
      : contextBlock(context, brief);
  const others = existingQuestions
    .filter((q) => q.id !== questionId)
    .map((q) => `- ${q.text}`)
    .join('\n');

  const userPrompt = `Generate ONE replacement interview question for a case study about ${clientName}.
Service provided: ${serviceProvided}
${ctx ? `\nEngagement context:\n${ctx}\n` : ''}
It must be clearly different from these other questions in the interview:
${others || '(none)'}

Make it specific to the engagement. Keep it under ${mode === 'premium_long_form' ? 30 : 25} words. Sound like a friendly podcast host. Never ask a yes/no question.

Return ONLY a JSON object:
{ "id": "${questionId}", "text": "..." }`;

  const text = await generateText(SYSTEM_PROMPT, userPrompt, true);
  const question = parseJsonResponse<Question>(text);

  if (!question?.text) throw new Error('AI returned a malformed question');

  return { id: questionId, text: question.text };
}
