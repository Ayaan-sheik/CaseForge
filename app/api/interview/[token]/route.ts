import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { clientOpenedEmail } from '@/lib/email/templates';
import { coreNumberFor, type TurnRow } from '@/lib/interview/turns';
import type { Question } from '@/lib/types';

/**
 * GET /api/interview/[token]
 * Public: returns the *current* question for the adaptive recording UI. The
 * interview is a queue of `responses` rows — exactly one unanswered (pending)
 * row at a time. Seeds the first core question if the interview hasn't started.
 */
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, client_name, status, questions')
    .eq('magic_token', params.token)
    .maybeSingle();

  if (!campaign || campaign.status === 'complete' || campaign.status === 'processing') {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
  }

  const core: Question[] = campaign.questions ?? [];
  if (core.length === 0) {
    return NextResponse.json({ error: 'Interview not ready' }, { status: 404 });
  }

  const { data: turns } = await supabase
    .from('responses')
    .select('sequence, question_text, is_followup, transcript_clean')
    .eq('campaign_id', campaign.id)
    .order('sequence', { ascending: true })
    .returns<TurnRow[]>();

  const rows = turns ?? [];
  const pending = rows.find((t) => !t.transcript_clean);

  const respond = (current: TurnRow | null, done: boolean) =>
    NextResponse.json({
      clientName: campaign.client_name,
      coreCount: core.length,
      done,
      current: current
        ? {
            sequence: current.sequence,
            text: current.question_text,
            isFollowup: current.is_followup,
            coreNumber: coreNumberFor(rows, current),
          }
        : null,
    });

  if (pending) return respond(pending, false);

  // No pending row. If nothing has been recorded yet, seed the first question.
  if (rows.length === 0) {
    const seed: TurnRow = {
      sequence: 0,
      question_text: core[0].text,
      is_followup: false,
      transcript_clean: null,
    };
    await supabase.from('responses').insert({
      campaign_id: campaign.id,
      sequence: 0,
      question_text: core[0].text,
      is_followup: false,
    });
    return respond(seed, false);
  }

  // Everything answered, nothing pending → the interview concluded.
  return respond(null, true);
}

/**
 * PATCH /api/interview/[token]
 * Called when the respondent opens the landing page: transitions
 * sent → recording (once) and emails the creator (template 2).
 */
export async function PATCH(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, client_name, status, creator_id')
    .eq('magic_token', params.token)
    .maybeSingle();

  if (!campaign || campaign.status === 'complete' || campaign.status === 'processing') {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
  }

  if (campaign.status === 'sent') {
    await supabase
      .from('campaigns')
      .update({ status: 'recording' })
      .eq('id', campaign.id);

    const { data: userData } = await supabase.auth.admin.getUserById(
      campaign.creator_id
    );
    const creatorEmail = userData?.user?.email;
    if (creatorEmail) {
      await sendEmail({
        to: creatorEmail,
        ...clientOpenedEmail({ clientName: campaign.client_name }),
      });
    }
  }

  return NextResponse.json({ success: true });
}
