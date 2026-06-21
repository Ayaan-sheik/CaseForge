import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateQuestions } from '@/lib/ai/generateQuestions';
import { summarizeBrief } from '@/lib/ai/buildBrief';
import type { AgencyContext } from '@/lib/types';

/**
 * POST /api/campaigns
 * Body: {
 *   clientName, clientIndustry, clientSize,
 *   briefAnswers: { problem, what_delivered, what_changed }
 * }
 * Structures the engagement brief, generates 4-5 core questions grounded in the
 * creator's global context + brief, and creates a draft campaign.
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
  const clientIndustry =
    typeof body?.clientIndustry === 'string' ? body.clientIndustry.trim() : '';
  const clientSize = typeof body?.clientSize === 'string' ? body.clientSize.trim() : '';
  const briefAnswers =
    body?.briefAnswers && typeof body.briefAnswers === 'object' ? body.briefAnswers : null;

  if (!clientName || !briefAnswers) {
    return NextResponse.json(
      { error: 'clientName and briefAnswers are required' },
      { status: 400 }
    );
  }

  // Global agency context (best-effort — questions still work without it).
  const { data: profile } = await supabase
    .from('profiles')
    .select('context')
    .eq('id', user.id)
    .single();
  const context = (profile?.context as AgencyContext | null) ?? null;

  let brief;
  let questions;
  try {
    brief = await summarizeBrief(briefAnswers as Record<string, string>);
    const serviceProvided = brief.what_delivered || 'their service';
    questions = await generateQuestions(clientName, serviceProvided, context, brief);
  } catch (err) {
    console.error('Brief/question generation failed:', err);
    return NextResponse.json(
      { error: 'Could not build the campaign — please try again' },
      { status: 502 }
    );
  }

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert({
      creator_id: user.id,
      client_name: clientName,
      service_provided: brief.what_delivered || 'their service',
      client_industry: clientIndustry || null,
      client_size: clientSize || null,
      brief,
      status: 'draft',
      questions,
    })
    .select()
    .single();

  if (error || !campaign) {
    console.error('Campaign insert failed:', error);
    return NextResponse.json({ error: 'Could not create campaign' }, { status: 500 });
  }

  return NextResponse.json({
    campaignId: campaign.id,
    questions,
    magicToken: campaign.magic_token,
  });
}
