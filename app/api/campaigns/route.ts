import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateQuestions } from '@/lib/ai/generateQuestions';

/**
 * POST /api/campaigns
 * Body: { clientName, serviceProvided }
 * Creates a draft campaign with 3 AI-generated questions.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const clientName = typeof body?.clientName === 'string' ? body.clientName.trim() : '';
  const serviceProvided =
    typeof body?.serviceProvided === 'string' ? body.serviceProvided.trim() : '';

  if (!clientName || !serviceProvided) {
    return NextResponse.json(
      { error: 'clientName and serviceProvided are required' },
      { status: 400 }
    );
  }

  let questions;
  try {
    questions = await generateQuestions(clientName, serviceProvided);
  } catch (err) {
    console.error('Question generation failed:', err);
    return NextResponse.json(
      { error: 'Question generation failed — please try again' },
      { status: 502 }
    );
  }

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert({
      creator_id: user.id,
      client_name: clientName,
      service_provided: serviceProvided,
      status: 'draft',
      questions,
    })
    .select()
    .single();

  if (error || !campaign) {
    console.error('Campaign insert failed:', error);
    return NextResponse.json(
      { error: 'Could not create campaign' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    campaignId: campaign.id,
    questions,
    magicToken: campaign.magic_token,
  });
}
