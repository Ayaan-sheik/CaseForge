import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { synthesizeCaseStudy } from '@/lib/ai/synthesizeCaseStudy';
import { generateAndUploadBothPDFs } from '@/lib/pdf/generatePDF';
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
    .select('id, creator_id, client_name, service_provided')
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

    // Case studies generated before the long-form fields existed have no
    // narrative, so a plain re-render would produce a 1-page long-form. Migrate
    // them by re-running the full synthesis (LLM) once to backfill the narrative.
    const needsNarrative =
      !Array.isArray(output.case_study.narrative_sections) ||
      output.case_study.narrative_sections.length === 0;

    if (needsNarrative) {
      try {
        // synthesizeCaseStudy regenerates the case study (with narrative),
        // renders + uploads both PDFs, upserts outputs, and keeps the web_slug.
        await synthesizeCaseStudy(params.campaignId);
        return NextResponse.json({ success: true });
      } catch (err) {
        // Don't leave a previously-complete campaign stuck in 'error', and still
        // give the user a usable PDF: fall back to a plain re-render, which now
        // yields a multi-page long-form via the structured-field fallback.
        console.error('Lazy re-synthesis failed, falling back to re-render:', err);
        await admin
          .from('campaigns')
          .update({ status: 'complete', error_message: null })
          .eq('id', params.campaignId);
      }
    }

    try {
      const { pdfUrl, pdfUrlLong } = await generateAndUploadBothPDFs(params.campaignId, {
        caseStudy: output.case_study,
        clientName: result.campaign.client_name,
        serviceProvided: result.campaign.service_provided,
      });

      await admin
        .from('outputs')
        .update({ pdf_url: pdfUrl, pdf_url_long: pdfUrlLong })
        .eq('campaign_id', params.campaignId);

      return NextResponse.json({ success: true, pdfUrl, pdfUrlLong });
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
