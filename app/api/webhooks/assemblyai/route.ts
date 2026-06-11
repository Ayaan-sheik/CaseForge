import { NextResponse } from 'next/server';

/**
 * AssemblyAI webhook endpoint — no longer used.
 * Transcription now happens synchronously via Groq Whisper in the upload route.
 * This endpoint is kept to avoid 404s from any lingering AssemblyAI requests.
 */
export async function POST() {
  return NextResponse.json({ received: true });
}
