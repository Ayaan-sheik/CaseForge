import { generateText } from './groq';

/**
 * Final case-study synthesis routing — the quality-critical stage ONLY.
 *
 * The benchmark (scripts/benchmark-synthesis-models.ts) found OpenAI gpt-4.1-mini
 * the most reliable synthesizer (completed both rich and thin fixtures, honest on
 * thin cases, avoided [NEEDS INPUT] leakage), so final synthesis defaults to it.
 * Groq llama-3.3-70b-versatile is the fallback when OpenAI is unavailable/fails.
 *
 * This routing is scoped to the *final* synthesis call only — interview question
 * generation, follow-ups, transcript cleanup, and story extraction all keep using
 * Groq via `generateText`. Story extraction's `purpose: 'synthesis'` Groq routing
 * is intentionally left untouched.
 *
 * Configurable via env (sensible defaults baked in):
 *   SYNTHESIS_PROVIDER           default 'openai'
 *   SYNTHESIS_MODEL              default 'gpt-4.1-mini'
 *   SYNTHESIS_FALLBACK_PROVIDER  default 'groq'
 *   SYNTHESIS_FALLBACK_MODEL     default 'llama-3.3-70b-versatile'
 */

export type SynthesisProvider = 'openai' | 'groq';

const PRIMARY_PROVIDER = ((process.env.SYNTHESIS_PROVIDER ?? 'openai') as SynthesisProvider);
const PRIMARY_MODEL = process.env.SYNTHESIS_MODEL ?? 'gpt-4.1-mini';
const FALLBACK_PROVIDER = ((process.env.SYNTHESIS_FALLBACK_PROVIDER ?? 'groq') as SynthesisProvider);
const FALLBACK_MODEL = process.env.SYNTHESIS_FALLBACK_MODEL ?? 'llama-3.3-70b-versatile';

// Synthesis emits a large JSON (the long-form narrative); give it room so the
// response isn't truncated and parseJsonResponse fails.
const MAX_TOKENS = 6000;

export interface SynthesisResult {
  text: string;
  provider: SynthesisProvider;
  model: string;
}

/** Call OpenAI's chat completions endpoint via native fetch (no SDK dependency). */
async function callOpenAI(system: string, user: string, model: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      max_tokens: MAX_TOKENS,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`);
    // 5xx and 429 are transient and worth one retry; 4xx (except 429) are not.
    (err as { transient?: boolean }).transient = res.status === 429 || res.status >= 500;
    throw err;
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}

/** Call one provider/model once. */
async function callProvider(
  provider: SynthesisProvider,
  model: string,
  system: string,
  user: string
): Promise<string> {
  if (provider === 'openai') return callOpenAI(system, user, model);
  // Groq path: pin the model explicitly so the fallback model is honoured
  // regardless of GROQ_SYNTHESIS_MODEL/GROQ_MODEL env config.
  return generateText(system, user, true, 'synthesis', model);
}

function isTransient(err: unknown): boolean {
  return Boolean((err as { transient?: boolean } | null)?.transient);
}

/**
 * Run the final synthesis with the configured provider, retrying once on a
 * transient primary failure, then falling back to the secondary provider.
 * Logs which provider/model ultimately produced the output.
 */
export async function runFinalSynthesis(system: string, user: string): Promise<SynthesisResult> {
  // ── Primary provider (one retry on transient errors) ──
  try {
    const text = await callProvider(PRIMARY_PROVIDER, PRIMARY_MODEL, system, user);
    console.log(`[synthesis] used ${PRIMARY_PROVIDER}/${PRIMARY_MODEL}`);
    return { text, provider: PRIMARY_PROVIDER, model: PRIMARY_MODEL };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isTransient(err)) {
      console.warn(`[synthesis] ${PRIMARY_PROVIDER}/${PRIMARY_MODEL} transient failure — retrying once: ${message}`);
      try {
        const text = await callProvider(PRIMARY_PROVIDER, PRIMARY_MODEL, system, user);
        console.log(`[synthesis] used ${PRIMARY_PROVIDER}/${PRIMARY_MODEL} (after retry)`);
        return { text, provider: PRIMARY_PROVIDER, model: PRIMARY_MODEL };
      } catch (retryErr) {
        const retryMessage = retryErr instanceof Error ? retryErr.message : String(retryErr);
        console.warn(`[synthesis] ${PRIMARY_PROVIDER}/${PRIMARY_MODEL} retry failed: ${retryMessage}`);
      }
    } else {
      console.warn(`[synthesis] ${PRIMARY_PROVIDER}/${PRIMARY_MODEL} failed (non-transient): ${message}`);
    }
  }

  // ── Fallback provider ──
  console.warn(`[synthesis] falling back to ${FALLBACK_PROVIDER}/${FALLBACK_MODEL}`);
  const text = await callProvider(FALLBACK_PROVIDER, FALLBACK_MODEL, system, user);
  console.log(`[synthesis] used ${FALLBACK_PROVIDER}/${FALLBACK_MODEL} (fallback)`);
  return { text, provider: FALLBACK_PROVIDER, model: FALLBACK_MODEL };
}
