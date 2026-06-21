import type { AgencyContext, EngagementBrief, Question } from '@/lib/types';
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

/**
 * Generate the 4-5 core interview questions for a campaign, grounded in the
 * agency's global context and the engagement brief. Adaptive follow-ups are
 * handled separately during the interview.
 */
export async function generateQuestions(
  clientName: string,
  serviceProvided: string,
  context?: AgencyContext | null,
  brief?: EngagementBrief | null
): Promise<Question[]> {
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

  const text = await generateText(SYSTEM_PROMPT, userPrompt, true);
  const { questions } = parseJsonResponse<{ questions: Question[] }>(text);

  if (
    !Array.isArray(questions) ||
    questions.length < 3 ||
    questions.some((q) => !q?.id || !q?.text)
  ) {
    throw new Error('AI returned malformed questions');
  }

  return questions;
}

/** Regenerate a single core question, keeping it distinct from the others. */
export async function regenerateQuestion(
  clientName: string,
  serviceProvided: string,
  questionId: string,
  existingQuestions: Question[],
  context?: AgencyContext | null,
  brief?: EngagementBrief | null
): Promise<Question> {
  const ctx = contextBlock(context, brief);
  const others = existingQuestions
    .filter((q) => q.id !== questionId)
    .map((q) => `- ${q.text}`)
    .join('\n');

  const userPrompt = `Generate ONE replacement interview question for a case study about ${clientName}.
Service provided: ${serviceProvided}
${ctx ? `\nEngagement context:\n${ctx}\n` : ''}
It must be clearly different from these other questions in the interview:
${others || '(none)'}

Make it specific to the engagement. Keep it under 25 words. Sound like a friendly podcast host. Never ask a yes/no question.

Return ONLY a JSON object:
{ "id": "${questionId}", "text": "..." }`;

  const text = await generateText(SYSTEM_PROMPT, userPrompt, true);
  const question = parseJsonResponse<Question>(text);

  if (!question?.text) throw new Error('AI returned a malformed question');

  return { id: questionId, text: question.text };
}
