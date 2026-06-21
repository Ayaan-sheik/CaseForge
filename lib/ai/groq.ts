import Groq from 'groq-sdk';

export const GROQ_MODEL =
  process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

// Synthesis is the quality-critical stage. Kept as its own env var so the model
// can be swapped (e.g. to a premium provider) without touching the chat stages.
// Defaults to the same Groq model in v1.
const GROQ_SYNTHESIS_MODEL = process.env.GROQ_SYNTHESIS_MODEL ?? GROQ_MODEL;

const GROQ_WHISPER_MODEL =
  process.env.GROQ_WHISPER_MODEL ?? 'whisper-large-v3';

/** Which model a call should use. 'chat' = fast/cheap; 'synthesis' = quality. */
export type LlmPurpose = 'chat' | 'synthesis';

let client: Groq | null = null;

function getGroq(): Groq {
  if (!client) {
    client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return client;
}

/**
 * Chat completion returning plain text. Pass json=true to enable JSON mode.
 * `purpose` selects the model: 'chat' (default) for fast/cheap stages,
 * 'synthesis' for the quality-critical case-study generation.
 */
export async function generateText(
  system: string,
  user: string,
  json = false,
  purpose: LlmPurpose = 'chat'
): Promise<string> {
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: user });

  const completion = await getGroq().chat.completions.create({
    model: purpose === 'synthesis' ? GROQ_SYNTHESIS_MODEL : GROQ_MODEL,
    messages,
    ...(json ? { response_format: { type: 'json_object' } } : {}),
  });

  return completion.choices[0]?.message?.content ?? '';
}

/**
 * Defensively strip markdown fences and find the outermost JSON
 * array or object in `text`, then parse it.
 */
export function parseJsonResponse<T>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.search(/[[{]/);
  if (start === -1) throw new Error('No JSON found in AI response');
  const end = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

/** Transcribe an audio file using Groq Whisper. Returns raw transcript text. */
export async function transcribeAudio(audio: File): Promise<string> {
  const transcription = await getGroq().audio.transcriptions.create({
    file: audio,
    model: GROQ_WHISPER_MODEL,
    response_format: 'json',
    language: 'en',
    prompt: 'Business interview. Client discussing their experience, challenges, solutions, and results.',
  });
  return transcription.text ?? '';
}
