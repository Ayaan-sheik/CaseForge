import { createAdminClient } from '@/lib/supabase/server';
import { generateSlug } from '@/lib/utils/generateSlug';
import { generateAndUploadPDF } from '@/lib/pdf/generatePDF';
import { sendEmail } from '@/lib/email/send';
import { outputsReadyEmail } from '@/lib/email/templates';
import type {
  Campaign,
  Question,
  ResponseRow,
  SynthesisResult,
} from '@/lib/types';
import { generateText, parseJsonResponse } from './groq';

const SYSTEM_PROMPT = `You are an elite B2B case study writer for SaaS and consulting companies. You write in clear, punchy, third-person narrative. You NEVER invent or extrapolate metrics — only use numbers explicitly stated. You write at a 9th-grade reading level with a professional tone. Every sentence earns its place.`;

/**
 * Turn 3 cleaned transcripts into all three outputs: structured case study,
 * hosted page slug, and PDF. Marks the campaign 'complete' on success and
 * 'error' (with a message) on failure.
 */
export async function synthesizeCaseStudy(campaignId: string): Promise<void> {
  const supabase = createAdminClient();

  try {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single<Campaign>();

    if (!campaign) throw new Error('Campaign not found');

    const questions: Question[] = campaign.questions ?? [];
    if (questions.length === 0) throw new Error('Campaign has no questions');

    const { data: responses } = await supabase
      .from('responses')
      .select('*')
      .eq('campaign_id', campaignId)
      .returns<ResponseRow[]>();

    const byQuestionId = new Map(
      (responses ?? []).map((r) => [r.question_id, r])
    );

    const pairs = questions.map((q) => ({
      question: q.text,
      answer: byQuestionId.get(q.id)?.transcript_clean,
    }));

    if (pairs.some((p) => !p.answer)) {
      throw new Error('Not all transcripts have been processed yet');
    }

    const userPrompt = `Write a case study from these interview answers.

Client: ${campaign.client_name}
Service provided: ${campaign.service_provided}

${pairs.map((p) => `Q: ${p.question}\nA: ${p.answer}`).join('\n\n')}

Return ONLY a valid JSON object (no markdown, no preamble):
{
  "title": "How [Client] [achieved specific result] with [Service] — make it specific and metric-driven if a metric was mentioned",
  "summary": "2 sentences. Hook the reader with the most impressive result first.",
  "challenge": "2-3 sentences describing the situation before. Make it relatable.",
  "solution": "3-4 sentences on what was implemented/done. Be specific.",
  "results": "2-3 sentences. Lead with the strongest metric. Bold important numbers by wrapping in **double asterisks**.",
  "testimonial_quote": "The single best verbatim or lightly-edited quote from the transcripts. Must sound human.",
  "linkedin_quotes": [
    { "quote": "First punchy insight or result in the client's voice, under 50 words", "context": "[Client Name] on [Service]" },
    { "quote": "Second quote — different angle, focus on transformation", "context": "[Client Name] on [Service]" },
    { "quote": "Third quote — recommendation or trust statement", "context": "[Client Name] on [Service]" }
  ]
}`;

    const text = await generateText(SYSTEM_PROMPT, userPrompt, true);
    const caseStudy = parseJsonResponse<SynthesisResult>(text);

    // Keep an already-published slug stable across "Retry Processing" runs.
    const { data: existing } = await supabase
      .from('outputs')
      .select('web_slug')
      .eq('campaign_id', campaignId)
      .maybeSingle();

    const webSlug = existing?.web_slug ?? generateSlug(campaign.client_name);

    const pdfUrl = await generateAndUploadPDF(campaignId, {
      title: caseStudy.title,
      summary: caseStudy.summary,
      challenge: caseStudy.challenge,
      solution: caseStudy.solution,
      results: caseStudy.results,
      testimonialQuote: caseStudy.testimonial_quote,
      clientName: campaign.client_name,
    });

    const { error: upsertError } = await supabase.from('outputs').upsert(
      {
        campaign_id: campaignId,
        case_study_title: caseStudy.title,
        case_study_summary: caseStudy.summary,
        case_study_challenge: caseStudy.challenge,
        case_study_solution: caseStudy.solution,
        case_study_results: caseStudy.results,
        testimonial_quote: caseStudy.testimonial_quote,
        linkedin_quotes: caseStudy.linkedin_quotes,
        pdf_url: pdfUrl,
        web_slug: webSlug,
      },
      { onConflict: 'campaign_id' }
    );

    if (upsertError) throw new Error(upsertError.message);

    await supabase
      .from('campaigns')
      .update({ status: 'complete', error_message: null })
      .eq('id', campaignId);

    const { data: userData } = await supabase.auth.admin.getUserById(
      campaign.creator_id
    );
    const creatorEmail = userData?.user?.email;

    if (creatorEmail) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
      await sendEmail({
        to: creatorEmail,
        ...outputsReadyEmail({
          clientName: campaign.client_name,
          dashboardLink: `${appUrl}/campaigns/${campaignId}/outputs`,
        }),
      });
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Synthesis failed';
    console.error(`Synthesis failed for campaign ${campaignId}:`, err);
    await supabase
      .from('campaigns')
      .update({ status: 'error', error_message: errorMessage })
      .eq('id', campaignId);
    throw err;
  }
}
