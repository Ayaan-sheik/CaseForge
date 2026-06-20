import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { transcribeAudio } from '@/lib/ai/groq';
import { cleanTranscript } from '@/lib/ai/cleanTranscript';
import type { Campaign, Question } from '@/lib/types';

// Whisper + LLM cleaning + the synthesis tail can exceed Vercel's default
// function timeout (10s hobby / 15s pro).
export const maxDuration = 60;

/**
 * POST /api/interview/[token]/upload
 * FormData: audio (File), questionId (string), duration (seconds, optional).
 *
 * Flow: upload audio → Supabase Storage → Groq Whisper transcription (sync)
 * → LLM clean → if all 3 questions done, fire synthesis.
 */
export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, status, questions')
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
  const questionId = formData.get('questionId');

  if (!(audio instanceof File) || typeof questionId !== 'string') {
    return NextResponse.json(
      { error: 'audio and questionId are required' },
      { status: 400 }
    );
  }

  const questions: Question[] = campaign.questions ?? [];
  if (!questions.some((q) => q.id === questionId)) {
    return NextResponse.json({ error: 'Unknown questionId' }, { status: 400 });
  }

  // Groq Whisper rejects uploads over 25MB (free tier) — fail fast with a
  // clear message instead of erroring mid-pipeline after storing the audio.
  const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: 'Audio file is empty or too large (max 25MB)' },
      { status: 413 }
    );
  }

  const durationRaw = Number(formData.get('duration'));
  const duration =
    Number.isFinite(durationRaw) && durationRaw > 0
      ? Math.round(durationRaw)
      : null;

  // Buffer the audio once so both Supabase and Groq can read from it.
  // A File's underlying ReadableStream can only be consumed once — if we pass
  // the raw File to Supabase first, the stream is exhausted and Groq would
  // receive an empty payload, producing an empty transcript in production.
  const audioBuffer = await audio.arrayBuffer();

  // ── 1. Upload audio to Supabase Storage ────────────────────────────────────
  const audioPath = `${campaign.id}/${questionId}.webm`;
  const { error: storageError } = await supabase.storage
    .from('audio')
    .upload(audioPath, audioBuffer, {
      contentType: audio.type || 'audio/webm',
      upsert: true,
    });

  if (storageError) {
    console.error('Audio storage upload failed:', storageError);
    return NextResponse.json(
      { error: 'Audio upload failed' },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl: audioUrl },
  } = supabase.storage.from('audio').getPublicUrl(audioPath);

  // ── 2. Upsert the response row (reset any stale transcripts from a re-record) ─
  const { data: responseRow, error: upsertError } = await supabase
    .from('responses')
    .upsert(
      {
        campaign_id: campaign.id,
        question_id: questionId,
        audio_url: audioUrl,
        duration_seconds: duration,
        transcript_raw: null,
        transcript_clean: null,
      },
      { onConflict: 'campaign_id,question_id' }
    )
    .select()
    .single();

  if (upsertError || !responseRow) {
    console.error('Response upsert failed:', upsertError);
    return NextResponse.json(
      { error: 'Could not save response' },
      { status: 500 }
    );
  }

  // ── 3. Transcribe with Groq Whisper ────────────────────────────────────────
  let rawTranscript: string;
  try {
    const audioForGroq = new File(
      [audioBuffer],
      audio.name || 'recording.webm',
      { type: audio.type || 'audio/webm' }
    );
    rawTranscript = await transcribeAudio(audioForGroq);
  } catch (err) {
    console.error('Transcription failed:', err);
    // Surface the underlying provider error (e.g. "model blocked at project
    // level", rate limit) so the creator can see why instead of a generic retry.
    const detail = err instanceof Error ? err.message : 'Unknown error';
    await supabase
      .from('campaigns')
      .update({
        status: 'error',
        error_message: `Transcription failed: ${detail}`,
      })
      .eq('id', campaign.id);
    return NextResponse.json(
      { error: 'Transcription failed' },
      { status: 502 }
    );
  }

  const { error: rawWriteError } = await supabase
    .from('responses')
    .update({ transcript_raw: rawTranscript })
    .eq('id', responseRow.id);
  if (rawWriteError) {
    console.error('Failed to persist raw transcript:', rawWriteError);
  }

  // ── 4. Clean transcript with LLM ───────────────────────────────────────────
  const cleanedTranscript = await cleanTranscript(rawTranscript).catch(
    () => rawTranscript // fall back to raw if cleaning fails
  );

  const { error: cleanWriteError } = await supabase
    .from('responses')
    .update({ transcript_clean: cleanedTranscript })
    .eq('id', responseRow.id);
  if (cleanWriteError) {
    // This is the field `/complete` reads to decide the interview is done; a
    // silent failure here would stall synthesis forever, so report it.
    console.error('Failed to persist cleaned transcript:', cleanWriteError);
    return NextResponse.json(
      { error: 'Could not save your answer — please try again.' },
      { status: 500 }
    );
  }

  // A previous question's transcription may have failed and parked the whole
  // campaign in `error`. This upload succeeded, so lift it back to `recording`
  // — otherwise `/complete` (which only acts on `recording`) can never fire
  // synthesis and the interview stays permanently wedged.
  if (campaign.status === 'error') {
    await supabase
      .from('campaigns')
      .update({ status: 'recording', error_message: null })
      .eq('id', campaign.id);
  }

  return NextResponse.json({ success: true, transcript: cleanedTranscript });
}
