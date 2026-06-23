import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { generateAndUploadPDF } from '@/lib/pdf/generatePDF';
import type { CaseStudy } from '@/lib/types';

// Re-renders one PDF per campaign in a loop, which can exceed the default timeout.
export const maxDuration = 60;

interface CampaignRow {
  id: string;
  client_name: string;
  service_provided: string;
}

/**
 * POST /api/outputs/regenerate-all
 * Re-renders the PDF (from the stored case study, no LLM) for every campaign the
 * signed-in user owns that has a generated case study. Used to roll a template
 * change across all existing case studies at once.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: campaigns } = await admin
    .from('campaigns')
    .select('id, client_name, service_provided')
    .eq('creator_id', user.id)
    .returns<CampaignRow[]>();

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({ regenerated: 0, failed: 0 });
  }

  const byId = new Map(campaigns.map((c) => [c.id, c]));

  const { data: outputs } = await admin
    .from('outputs')
    .select('campaign_id, case_study')
    .in(
      'campaign_id',
      campaigns.map((c) => c.id)
    )
    .returns<{ campaign_id: string; case_study: CaseStudy | null }[]>();

  let regenerated = 0;
  let failed = 0;

  for (const output of outputs ?? []) {
    const campaign = byId.get(output.campaign_id);
    if (!campaign || !output.case_study) continue;

    try {
      const pdfUrl = await generateAndUploadPDF(output.campaign_id, {
        caseStudy: output.case_study,
        clientName: campaign.client_name,
        serviceProvided: campaign.service_provided,
      });
      await admin.from('outputs').update({ pdf_url: pdfUrl }).eq('campaign_id', output.campaign_id);
      regenerated += 1;
    } catch (err) {
      console.error(`Bulk PDF regeneration failed for campaign ${output.campaign_id}:`, err);
      failed += 1;
    }
  }

  return NextResponse.json({ regenerated, failed });
}
