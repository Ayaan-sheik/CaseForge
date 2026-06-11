import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { transcribeAudio } from '@/lib/ai/groq';
import { cleanTranscript } from '@/lib/ai/cleanTranscript';
import { synthesizeCaseStudy } from '@/lib/ai/synthesizeCaseStudy';
import type { Campaign, Question } from '@/lib/types';

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

  if (!campaign || campaign.status === 'complete') {
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

  const durationRaw = Number(formData.get('duration'));
  const duration =
    Number.isFinite(durationRaw) && durationRaw > 0
      ? Math.round(durationRaw)
      : null;

  // ── 1. Upload audio to Supabase Storage ────────────────────────────────────
  const audioPath = `${campaign.id}/${questionId}.webm`;
  const { error: storageError } = await supabase.storage
    .from('audio')
    .upload(audioPath, audio, {
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
    rawTranscript = await transcribeAudio(audio);
  } catch (err) {
    console.error('Transcription failed:', err);
    await supabase
      .from('campaigns')
      .update({
        status: 'error',
        error_message: 'Transcription failed — please retry.',
      })
      .eq('id', campaign.id);
    return NextResponse.json(
      { error: 'Transcription failed' },
      { status: 502 }
    );
  }

  await supabase
    .from('responses')
    .update({ transcript_raw: rawTranscript })
    .eq('id', responseRow.id);

  // ── 4. Clean transcript with LLM ───────────────────────────────────────────
  const cleanedTranscript = await cleanTranscript(rawTranscript).catch(
    () => rawTranscript // fall back to raw if cleaning fails
  );

  await supabase
    .from('responses')
    .update({ transcript_clean: cleanedTranscript })
    .eq('id', responseRow.id);

  // ── 5. Check if all questions are done; trigger synthesis if so ────────────
  const { data: allResponses } = await supabase
    .from('responses')
    .select('question_id, transcript_clean')
    .eq('campaign_id', campaign.id);

  const cleanedIds = new Set(
    (allResponses ?? [])
      .filter((r) => r.transcript_clean)
      .map((r) => r.question_id)
  );

  const allDone =
    questions.length > 0 && questions.every((q) => cleanedIds.has(q.id));

  if (allDone) {
    // Fire-and-forget: synthesis runs after the response is returned.
    synthesizeCaseStudy(campaign.id).catch((err) =>
      console.error('Synthesis failed:', err)
    );
  }

  return NextResponse.json({ success: true });
}
