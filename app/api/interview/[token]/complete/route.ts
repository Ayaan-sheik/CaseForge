import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { createAdminClient } from '@/lib/supabase/server';
import { synthesizeCaseStudy } from '@/lib/ai/synthesizeCaseStudy';
import type { Campaign, Question } from '@/lib/types';

export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, status, questions')
    .eq('magic_token', params.token)
    .maybeSingle<Campaign>();

  if (!campaign) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
  }

  if (campaign.status !== 'recording') {
    return NextResponse.json({ success: true });
  }

  const questions: Question[] = campaign.questions ?? [];

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
  }

  return NextResponse.json({ success: true });
}
