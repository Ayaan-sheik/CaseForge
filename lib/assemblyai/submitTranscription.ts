const ASSEMBLYAI_API_URL = 'https://api.assemblyai.com/v2/transcript';

/**
 * Submit a public audio URL for async transcription. AssemblyAI POSTs to our
 * webhook when done. Returns the transcript id.
 */
export async function submitTranscription(audioUrl: string): Promise<string> {
  const response = await fetch(ASSEMBLYAI_API_URL, {
    method: 'POST',
    headers: {
      authorization: process.env.ASSEMBLYAI_API_KEY!,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      punctuate: true,
      format_text: true,
      webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/assemblyai`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AssemblyAI submission failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}

/** Fetch a finished transcript (webhook payloads carry ids, not text). */
export async function fetchTranscript(
  transcriptId: string
): Promise<{ status: string; text: string | null; error?: string }> {
  const response = await fetch(`${ASSEMBLYAI_API_URL}/${transcriptId}`, {
    headers: { authorization: process.env.ASSEMBLYAI_API_KEY! },
  });

  if (!response.ok) {
    throw new Error(`AssemblyAI fetch failed (${response.status})`);
  }

  return response.json();
}
