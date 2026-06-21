import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { transcribeAudio } from '@/lib/ai/groq';
import { cleanTranscript } from '@/lib/ai/cleanTranscript';
import { decideFollowup } from '@/lib/ai/interviewDirector';
import {
  coreNumberFor,
  MAX_FOLLOWUPS_PER_CORE,
  MAX_TURNS,
  type TurnRow,
} from '@/lib/interview/turns';
import type { AgencyContext, Campaign, Question } from '@/lib/types';

// Whisper + LLM cleaning + the director call can exceed Vercel's default
// function timeout (10s hobby / 15s pro).
export const maxDuration = 60;

/**
 * POST /api/interview/[token]/upload
 * FormData: audio (File), sequence (number — the pending turn being answered),
 * duration (seconds, optional).
 *
 * Flow: store audio → Groq Whisper → LLM clean → ask the director whether to
 * probe with a follow-up or advance → queue the next question (or finish).
 */
export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, status, questions, brief, creator_id')
    .eq('magic_token', params.token)
    .maybeSingle<Campaign>();

  if (!campaign || campaign.status === 'complete' || campaign.status === 'processing') {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
  }

  const core: Question[] = campaign.questions ?? [];

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
    .select('id, sequence, question_text, is_followup, transcript_clean')
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
    const detail = err instanceof Error ? err.message : 'Unknown error';
    await supabase
      .from('campaigns')
      .update({ status: 'error', error_message: `Transcription failed: ${detail}` })
      .eq('id', campaign.id);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
  }

  const cleanedTranscript = await cleanTranscript(rawTranscript).catch(() => rawTranscript);

  const { error: updateError } = await supabase
    .from('responses')
    .update({
      audio_url: audioUrl,
      duration_seconds: duration,
      transcript_raw: rawTranscript,
      transcript_clean: cleanedTranscript,
    })
    .eq('id', pendingRow.id);

  if (updateError) {
    console.error('Failed to persist transcript:', updateError);
    return NextResponse.json(
      { error: 'Could not save your answer — please try again.' },
      { status: 500 }
    );
  }

  // A prior turn's transcription may have parked the campaign in `error`; this
  // upload succeeded, so lift it back to `recording`.
  if (campaign.status === 'error') {
    await supabase
      .from('campaigns')
      .update({ status: 'recording', error_message: null })
      .eq('id', campaign.id);
  }

  // ── 3. Decide the next turn ─────────────────────────────────────────────────
  const { data: allTurns } = await supabase
    .from('responses')
    .select('sequence, question_text, is_followup, transcript_clean')
    .eq('campaign_id', campaign.id)
    .order('sequence', { ascending: true })
    .returns<TurnRow[]>();

  const rows = allTurns ?? [];
  const answered = rows.filter((r) => r.transcript_clean);
  const coreAsked = answered.filter((r) => !r.is_followup).length;
  const currentCore = [...answered].reverse().find((r) => !r.is_followup);
  const priorFollowups = currentCore
    ? answered.filter((r) => r.is_followup && r.sequence > currentCore.sequence).length
    : 0;
  const maxSeq = rows.reduce((m, r) => Math.max(m, r.sequence), 0);

  let next: { text: string; isFollowup: boolean } | null = null;

  if (answered.length < MAX_TURNS) {
    let probe = { probe: false, question: null as string | null };
    if (currentCore && priorFollowups < MAX_FOLLOWUPS_PER_CORE) {
      const context = await loadContext(supabase, campaign.creator_id);
      probe = await decideFollowup({
        context,
        brief: campaign.brief,
        coreQuestion: currentCore.question_text ?? '',
        lastAnswer: cleanedTranscript,
        priorFollowups,
      }).catch(() => ({ probe: false, question: null }));
    }

    if (probe.probe && probe.question) {
      next = { text: probe.question, isFollowup: true };
    } else if (coreAsked < core.length) {
      next = { text: core[coreAsked].text, isFollowup: false };
    }
  }

  if (!next) {
    return NextResponse.json({ transcript: cleanedTranscript, done: true });
  }

  const nextSequence = maxSeq + 1;
  await supabase.from('responses').insert({
    campaign_id: campaign.id,
    sequence: nextSequence,
    question_text: next.text,
    is_followup: next.isFollowup,
  });

  const nextRow: TurnRow = {
    sequence: nextSequence,
    question_text: next.text,
    is_followup: next.isFollowup,
    transcript_clean: null,
  };

  return NextResponse.json({
    transcript: cleanedTranscript,
    done: false,
    nextQuestion: {
      sequence: nextSequence,
      text: next.text,
      isFollowup: next.isFollowup,
      coreNumber: coreNumberFor([...rows, nextRow], nextRow),
    },
  });
}

async function loadContext(
  supabase: ReturnType<typeof createAdminClient>,
  creatorId: string
): Promise<AgencyContext | null> {
  const { data } = await supabase
    .from('profiles')
    .select('context')
    .eq('id', creatorId)
    .maybeSingle();
  return (data?.context as AgencyContext | null) ?? null;
}
