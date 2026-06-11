import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/interview/[token]/complete
 * Called after the respondent submits Q3. Moves the campaign to 'processing'.
 * The creator was already notified when the interview started (see
 * PATCH /api/interview/[token]); synthesis itself is triggered by the
 * upload route once all 3 transcripts are clean.
 */
export async function POST(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, status')
    .eq('magic_token', params.token)
    .maybeSingle();

  if (!campaign) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
  }

  if (campaign.status === 'recording') {
    await supabase
      .from('campaigns')
      .update({ status: 'processing' })
      .eq('id', campaign.id);
  }

  return NextResponse.json({ success: true });
}
