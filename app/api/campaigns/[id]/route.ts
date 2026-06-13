import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { regenerateQuestion } from '@/lib/ai/generateQuestions';
import { sendEmail } from '@/lib/email/send';
import { campaignCreatedEmail } from '@/lib/email/templates';
import type { CampaignStatus } from '@/lib/types';

const VALID_STATUSES: CampaignStatus[] = [
  'draft',
  'sent',
  'recording',
  'processing',
  'complete',
  'error',
];

/** GET /api/campaigns/[id] — fetch one of the creator's campaigns. */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', params.id)
    .eq('creator_id', user.id)
    .maybeSingle();

  if (!campaign) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ campaign });
}

/**
 * PATCH /api/campaigns/[id]
 * Body either:
 *  - { action: 'regenerate_question', questionId, questions? } → { question }
 *  - { questions?, status? } → updates the campaign; transitioning to 'sent'
 *    emails the creator their magic link.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', params.id)
    .eq('creator_id', user.id)
    .maybeSingle();

  if (!campaign) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.action === 'regenerate_question') {
    if (typeof body.questionId !== 'string') {
      return NextResponse.json(
        { error: 'questionId is required' },
        { status: 400 }
      );
    }
    try {
      const question = await regenerateQuestion(
        campaign.client_name,
        campaign.service_provided,
        body.questionId,
        Array.isArray(body.questions) ? body.questions : campaign.questions ?? []
      );
      return NextResponse.json({ question });
    } catch (err) {
      console.error('Question regeneration failed:', err);
      return NextResponse.json(
        { error: 'Regeneration failed — please try again' },
        { status: 502 }
      );
    }
  }

  const updates: Record<string, unknown> = {};
  if (Array.isArray(body.questions)) {
    updates.questions = body.questions;
  }
  if (typeof body.status === 'string') {
    if (!VALID_STATUSES.includes(body.status as CampaignStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from('campaigns')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error || !updated) {
    console.error('Campaign update failed:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  // Campaign just finalized: send the creator their magic link (template 1).
  if (campaign.status === 'draft' && updated.status === 'sent' && user.email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    await sendEmail({
      to: user.email,
      ...campaignCreatedEmail({
        clientName: updated.client_name,
        link: `${appUrl}/interview/${updated.magic_token}`,
      }),
    });
  }

  return NextResponse.json({ campaign: updated });
}

/**
 * DELETE /api/campaigns/[id]
 * Permanently removes one of the creator's campaigns. Deleting the row cascades
 * to its `responses` and `outputs` rows; the audio/PDF files in Storage are not
 * covered by that cascade, so we remove them explicitly first.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Confirm ownership before touching anything.
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', params.id)
    .eq('creator_id', user.id)
    .maybeSingle();

  if (!campaign) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Storage is NOT covered by the DB cascade — remove audio + PDF explicitly.
  // Files are named deterministically by campaign id; .remove() no-ops on misses.
  const admin = createAdminClient();
  const { data: audioFiles } = await admin.storage.from('audio').list(params.id);
  if (audioFiles?.length) {
    await admin.storage
      .from('audio')
      .remove(audioFiles.map((f) => `${params.id}/${f.name}`));
  }
  await admin.storage.from('pdfs').remove([`${params.id}.pdf`]);

  // Delete the row last (cascades to responses/outputs).
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', params.id)
    .eq('creator_id', user.id);

  if (error) {
    console.error('Campaign delete failed:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
