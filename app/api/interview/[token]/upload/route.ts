import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { transcribeAudio } from '@/lib/ai/groq';
import { cleanTranscript } from '@/lib/ai/cleanTranscript';
import type { Campaign } from '@/lib/types';

// Whisper + LLM cleaning can exceed Vercel's default function timeout
// (10s hobby / 15s pro).
export const maxDuration = 60;

/**
 * POST /api/interview/[token]/upload
 * FormData: audio (File), sequence (number — the pending turn being answered),
 * duration (seconds, optional).
 *
 * Transcribe-only: store audio → Groq Whisper → LLM clean → return the cleaned
 * transcript for the client to review/edit. The turn stays PENDING here
 * (transcript_clean is left null); it's only marked answered when the client
 * confirms via /commit. This lets the user edit the transcript before it's saved.
 */
export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, status')
    .eq('magic_token', params.token)
    .maybeSingle<Campaign>();

  if (!campaign || campaign.status === 'complete' || campaign.status === 'processing') {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const audio = formData.get('audio');
  const sequence = Number(formData.get('sequence'));

  if (!(audio instanceof File) || !Number.isInteger(sequence) || sequence < 0) {
    return NextResponse.json(
      { error: 'audio and a valid sequence are required' },
      { status: 400 }
    );
  }

  // The pending row for this turn must exist and be unanswered.
  const { data: pendingRow } = await supabase
    .from('responses')
    .select('id, sequence, transcript_clean')
    .eq('campaign_id', campaign.id)
    .eq('sequence', sequence)
    .maybeSingle();

  if (!pendingRow || pendingRow.transcript_clean) {
    return NextResponse.json(
      { error: 'This question has already been answered' },
      { status: 409 }
    );
  }

  // Groq Whisper rejects uploads over 25MB (free tier).
  const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: 'Audio file is empty or too large (max 25MB)' },
      { status: 413 }
    );
  }

  const durationRaw = Number(formData.get('duration'));
  const duration =
    Number.isFinite(durationRaw) && durationRaw > 0 ? Math.round(durationRaw) : null;

  // Buffer the audio once so both Supabase and Groq can read it (a File's
  // stream can only be consumed once).
  const audioBuffer = await audio.arrayBuffer();

  // ── 1. Store audio ──────────────────────────────────────────────────────────
  const audioPath = `${campaign.id}/${sequence}.webm`;
  const { error: storageError } = await supabase.storage
    .from('audio')
    .upload(audioPath, audioBuffer, {
      contentType: audio.type || 'audio/webm',
      upsert: true,
    });

  if (storageError) {
    console.error('Audio storage upload failed:', storageError);
    return NextResponse.json({ error: 'Audio upload failed' }, { status: 500 });
  }

  const {
    data: { publicUrl: audioUrl },
  } = supabase.storage.from('audio').getPublicUrl(audioPath);

  // ── 2. Transcribe + clean ───────────────────────────────────────────────────
  let rawTranscript: string;
  try {
    const audioForGroq = new File([audioBuffer], audio.name || 'recording.webm', {
      type: audio.type || 'audio/webm',
    });
    rawTranscript = await transcribeAudio(audioForGroq);
  } catch (err) {
    console.error('Transcription failed:', err);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
  }

  const cleanedTranscript = await cleanTranscript(rawTranscript).catch(() => rawTranscript);

  // Persist audio + raw transcript on the pending row, but leave
  // transcript_clean null so the turn stays pending until the client commits.
  const { error: updateError } = await supabase
    .from('responses')
    .update({
      audio_url: audioUrl,
      duration_seconds: duration,
      transcript_raw: rawTranscript,
    })
    .eq('id', pendingRow.id);

  if (updateError) {
    console.error('Failed to persist audio/transcript:', updateError);
    return NextResponse.json(
      { error: 'Could not save your recording — please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ transcript: cleanedTranscript });
}
