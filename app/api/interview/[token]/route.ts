import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { clientOpenedEmail } from '@/lib/email/templates';

/**
 * GET /api/interview/[token]
 * Public: returns the campaign's questions for the recording UI.
 */
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, client_name, service_provided, status, questions')
    .eq('magic_token', params.token)
    .maybeSingle();

  if (!campaign || campaign.status === 'complete' || campaign.status === 'processing') {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
  }

  return NextResponse.json({
    campaignId: campaign.id,
    clientName: campaign.client_name,
    serviceProvided: campaign.service_provided,
    questions: campaign.questions,
  });
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
