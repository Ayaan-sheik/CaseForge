import type { Question } from '@/lib/types';
import { generateText, parseJsonResponse } from './groq';

const SYSTEM_PROMPT = `You are an expert B2B case study interviewer. You write questions that extract specific, metric-driven answers. Your questions are conversational and easy to answer verbally. You never ask yes/no questions. You always aim for quantifiable outcomes, before/after contrast, and personal recommendation.`;

const QUESTION_FOCUS: Record<string, string> = {
  q1: 'A specific, quantifiable outcome or metric (revenue, time saved, leads, etc.)',
  q2: 'The situation before working together — the challenge or pain point',
  q3: "Whether they'd recommend this service and why (emotional/trust close)",
};

export async function generateQuestions(
  clientName: string,
  serviceProvided: string
): Promise<Question[]> {
  const userPrompt = `Generate exactly 3 interview questions for a case study.
Client name: ${clientName}
Service provided: ${serviceProvided}

Question 1 must focus on: A specific, quantifiable outcome or metric (revenue, time saved, leads, etc.)
Question 2 must focus on: The situation before working together — the challenge or pain point
Question 3 must focus on: Whether they'd recommend this service and why (emotional/trust close)

Make each question specific to the service provided. Keep each question under 25 words. Make them sound like a friendly podcast host asking, not a corporate survey.

Return ONLY a JSON object:
{
  "questions": [
    { "id": "q1", "text": "..." },
    { "id": "q2", "text": "..." },
    { "id": "q3", "text": "..." }
  ]
}`;

  const text = await generateText(SYSTEM_PROMPT, userPrompt, true);
  const { questions } = parseJsonResponse<{ questions: Question[] }>(text);

  if (
    !Array.isArray(questions) ||
    questions.length !== 3 ||
    questions.some((q) => !q?.id || !q?.text)
  ) {
    throw new Error('AI returned malformed questions');
  }

  return questions;
}

/** Regenerate a single question, keeping it distinct from the other two. */
export async function regenerateQuestion(
  clientName: string,
  serviceProvided: string,
  questionId: string,
  existingQuestions: Question[]
): Promise<Question> {
  const focus = QUESTION_FOCUS[questionId];
  if (!focus) throw new Error(`Unknown question id: ${questionId}`);

  const others = existingQuestions
    .filter((q) => q.id !== questionId)
    .map((q) => `- ${q.text}`)
    .join('\n');

  const userPrompt = `Generate exactly ONE replacement interview question for a case study.
Client name: ${clientName}
Service provided: ${serviceProvided}

The question must focus on: ${focus}

It must be clearly different from these other questions in the interview:
${others || '(none)'}

Make it specific to the service provided. Keep it under 25 words. Make it sound like a friendly podcast host asking, not a corporate survey. Never ask a yes/no question.

Return ONLY a JSON object:
{ "id": "${questionId}", "text": "..." }`;

  const text = await generateText(SYSTEM_PROMPT, userPrompt, true);
  const question = parseJsonResponse<Question>(text);

  if (!question?.text) throw new Error('AI returned a malformed question');

  return { id: questionId, text: question.text };
}
