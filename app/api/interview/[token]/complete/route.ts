import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { createAdminClient } from '@/lib/supabase/server';
import { synthesizeCaseStudy } from '@/lib/ai/synthesizeCaseStudy';
import type { Campaign } from '@/lib/types';

export const maxDuration = 300;

/**
 * POST /api/interview/[token]/complete
 * Called by the client once the director has ended the interview. Locks the
 * campaign recording → processing (idempotently) and fires synthesis. The
 * interview length is decided server-side, so we only need at least one
 * answered turn before generating.
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
    .maybeSingle<Campaign>();

  if (!campaign) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
  }

  if (campaign.status !== 'recording') {
    return NextResponse.json({ success: true });
  }

  // Guard against an empty interview (no answered turns yet).
  const { count } = await supabase
    .from('responses')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id)
    .not('transcript_clean', 'is', null);

  if (!count) {
    return NextResponse.json({ success: true });
  }

  const { data: locked } = await supabase
    .from('campaigns')
    .update({ status: 'processing' })
    .eq('id', campaign.id)
    .eq('status', 'recording')
    .select('id')
    .maybeSingle();

  if (locked) {
    waitUntil(
      synthesizeCaseStudy(campaign.id).catch((err) =>
        console.error('Synthesis failed:', err)
      )
    );
  }

  return NextResponse.json({ success: true });
}
