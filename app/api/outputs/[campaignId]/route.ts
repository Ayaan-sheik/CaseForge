import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { synthesizeCaseStudy } from '@/lib/ai/synthesizeCaseStudy';
import { generateAndUploadPDF } from '@/lib/pdf/generatePDF';
import type { Output } from '@/lib/types';

// The synthesize action awaits the full pipeline (LLM + PDF render + upload
// + email), which exceeds Vercel's default function timeout.
export const maxDuration = 60;

async function requireOwnedCampaign(campaignId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized', status: 401 as const };

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, creator_id, client_name')
    .eq('id', campaignId)
    .maybeSingle();

  // campaigns has a public-read policy, so check ownership explicitly
  if (!campaign || campaign.creator_id !== user.id) {
    return { error: 'Not found', status: 404 as const };
  }

  return { campaign };
}

/** GET /api/outputs/[campaignId] — fetch the generated outputs. */
export async function GET(
  _request: Request,
  { params }: { params: { campaignId: string } }
) {
  const result = await requireOwnedCampaign(params.campaignId);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const supabase = createClient();
  const { data: output } = await supabase
    .from('outputs')
    .select('*')
    .eq('campaign_id', params.campaignId)
    .maybeSingle();

  if (!output) {
    return NextResponse.json({ error: 'Outputs not ready' }, { status: 404 });
  }

  return NextResponse.json({ output });
}

/**
 * POST /api/outputs/[campaignId]
 * Body: { action?: 'synthesize' | 'regenerate_pdf' } (default 'synthesize')
 *  - synthesize: re-runs the full synthesis pipeline ("Retry Processing")
 *  - regenerate_pdf: re-renders just the PDF from the stored case study
 */
export async function POST(
  request: Request,
  { params }: { params: { campaignId: string } }
) {
  const result = await requireOwnedCampaign(params.campaignId);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const body = await request.json().catch(() => ({}));
  const action = body?.action === 'regenerate_pdf' ? 'regenerate_pdf' : 'synthesize';

  if (action === 'regenerate_pdf') {
    const admin = createAdminClient();
    const { data: output } = await admin
      .from('outputs')
      .select('*')
      .eq('campaign_id', params.campaignId)
      .maybeSingle<Output>();

    if (!output?.case_study) {
      return NextResponse.json(
        { error: 'No case study to regenerate — run synthesis first' },
        { status: 400 }
      );
    }

    try {
      const pdfUrl = await generateAndUploadPDF(params.campaignId, {
        caseStudy: output.case_study,
        clientName: result.campaign.client_name,
      });

      await admin
        .from('outputs')
        .update({ pdf_url: pdfUrl })
        .eq('campaign_id', params.campaignId);

      return NextResponse.json({ success: true, pdfUrl });
    } catch (err) {
      console.error('PDF regeneration failed:', err);
      return NextResponse.json(
        { error: 'PDF regeneration failed' },
        { status: 500 }
      );
    }
  }

  try {
    await synthesizeCaseStudy(params.campaignId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Synthesis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
