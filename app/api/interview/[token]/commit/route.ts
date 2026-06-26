import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { decideFollowup } from '@/lib/ai/interviewDirector';
import { capsForMode, coreNumberFor, type TurnRow } from '@/lib/interview/turns';
import type { AgencyContext, Campaign, Question } from '@/lib/types';

// The director call (an LLM round-trip) can exceed Vercel's default timeout.
export const maxDuration = 60;

/**
 * POST /api/interview/[token]/commit
 * JSON: { sequence (number — the pending turn), transcript (string — the final,
 * possibly user-edited answer text) }.
 *
 * Finalizes a turn: writes transcript_clean (marking it answered), then asks the
 * director whether to probe with a follow-up or advance, and queues the next
 * question (or reports done). Audio + transcription already happened in /upload.
 */
export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, status, questions, brief, creator_id, case_study_mode, metrics')
    .eq('magic_token', params.token)
    .maybeSingle<Campaign>();

  if (!campaign || campaign.status === 'complete' || campaign.status === 'processing') {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
  }

  const core: Question[] = campaign.questions ?? [];

  const body = await request.json().catch(() => null);
  const sequence = Number(body?.sequence);
  const transcript = typeof body?.transcript === 'string' ? body.transcript.trim() : '';

  if (!Number.isInteger(sequence) || sequence < 0) {
    return NextResponse.json({ error: 'A valid sequence is required' }, { status: 400 });
  }
  if (!transcript) {
    return NextResponse.json({ error: 'Answer text is required' }, { status: 400 });
  }

  // The pending row for this turn must exist and still be unanswered.
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

  const { error: updateError } = await supabase
    .from('responses')
    .update({ transcript_clean: transcript })
    .eq('id', pendingRow.id);

  if (updateError) {
    console.error('Failed to persist answer:', updateError);
    return NextResponse.json(
      { error: 'Could not save your answer — please try again.' },
      { status: 500 }
    );
  }

  // A prior turn's transcription may have parked the campaign in `error`; this
  // answer committed fine, so lift it back to `recording`.
  if (campaign.status === 'error') {
    await supabase
      .from('campaigns')
      .update({ status: 'recording', error_message: null })
      .eq('id', campaign.id);
  }

  // ── Decide the next turn ─────────────────────────────────────────────────────
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

  const { maxTurns, maxFollowupsPerCore } = capsForMode(campaign.case_study_mode);

  let next: { text: string; isFollowup: boolean } | null = null;

  if (answered.length < maxTurns) {
    let probe = { probe: false, question: null as string | null };
    if (currentCore && priorFollowups < maxFollowupsPerCore) {
      const context = await loadContext(supabase, campaign.creator_id);
      const priorAnswers = answered
        .filter((r) => r.sequence !== sequence)
        .map((r) => `Q: ${r.question_text}\nA: ${r.transcript_clean}`)
        .join('\n\n');
      probe = await decideFollowup({
        context,
        brief: campaign.brief,
        coreQuestion: currentCore.question_text ?? '',
        lastAnswer: transcript,
        priorFollowups,
        priorAnswers,
        mode: campaign.case_study_mode,
        metrics: campaign.metrics,
      }).catch(() => ({ probe: false, question: null }));
    }

    if (probe.probe && probe.question) {
      next = { text: probe.question, isFollowup: true };
    } else if (coreAsked < core.length) {
      next = { text: core[coreAsked].text, isFollowup: false };
    }
  }

  if (!next) {
    return NextResponse.json({ done: true });
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
