import { createAdminClient } from '@/lib/supabase/server';
import { generateSlug } from '@/lib/utils/generateSlug';
import { generateAndUploadPDF } from '@/lib/pdf/generatePDF';
import { sendEmail } from '@/lib/email/send';
import { outputsReadyEmail } from '@/lib/email/templates';
import type { AgencyContext, CaseStudy } from '@/lib/types';
import { generateText, parseJsonResponse } from './groq';

const SYSTEM_PROMPT = `You are a B2B case study writer who makes case studies read like a real testimonial the client gave — not like marketing a model wrote about them. Hard rules:
- NEVER invent or extrapolate metrics. Only use numbers the client actually stated.
- Pull quotes must be VERBATIM from the transcript — copy the client's exact words. Do not polish, combine, or paraphrase them.
- In the Problem section, preserve the client's own framing and phrasing; only fix grammar.
- Avoid brochure language and hype ("game-changing", "seamless", "best-in-class", "revolutionary"). Plain, specific, human.
- Third person for narration, the client's voice for quotes. 9th-grade reading level.
- If a section has no real material, keep it short and honest rather than padding it.`;

interface InterviewTurn {
  sequence: number;
  question_text: string | null;
  transcript_clean: string | null;
}

/**
 * Turn the cleaned interview transcript into the full 9-section case study,
 * render the condensed PDF one-pager, and publish the hosted page. Marks the
 * campaign 'complete' on success and 'error' (with a message) on failure.
 */
export async function synthesizeCaseStudy(campaignId: string): Promise<void> {
  const supabase = createAdminClient();

  try {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (!campaign) throw new Error('Campaign not found');

    const { data: turns } = await supabase
      .from('responses')
      .select('sequence, question_text, transcript_clean')
      .eq('campaign_id', campaignId)
      .order('sequence', { ascending: true })
      .returns<InterviewTurn[]>();

    const answered = (turns ?? []).filter((t) => t.transcript_clean?.trim());
    if (answered.length === 0) {
      throw new Error('No answered interview turns to synthesize');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('context')
      .eq('id', campaign.creator_id)
      .maybeSingle();
    const context = (profile?.context as AgencyContext | null) ?? null;

    const transcript = answered
      .map((t) => `Q: ${t.question_text ?? ''}\nA: ${t.transcript_clean}`)
      .join('\n\n');

    const briefBlock = campaign.brief
      ? `Consultant's brief:\n- Problem: ${campaign.brief.problem}\n- Delivered: ${campaign.brief.what_delivered}\n- Outcome claimed: ${campaign.brief.what_changed}\n`
      : '';
    const contextBlock = context
      ? `About the consultant: ${context.what_you_do}. Voice to match: ${context.tone}.\n`
      : '';

    const userPrompt = `Write a case study about ${campaign.client_name}.
Industry: ${campaign.client_industry ?? 'unknown'}
Company size: ${campaign.client_size ?? 'unknown'}
Service provided: ${campaign.service_provided}
${contextBlock}${briefBlock}
Interview transcript (the client's own words):
${transcript}

Return ONLY a valid JSON object (no markdown, no preamble):
{
  "title": "How ${campaign.client_name} [achieved specific result] with [service] — specific and metric-driven if a metric was stated",
  "snapshot": {
    "industry": "${campaign.client_industry ?? ''}",
    "size": "${campaign.client_size ?? ''}",
    "headline_metric": "the single most impressive number from the interview, short (e.g. '32% of revenue'); empty string if none was stated"
  },
  "exec_summary": "Under 100 words. One sentence on the problem, one on what changed, one on the result.",
  "problem": "1-2 short paragraphs in the client's own framing. Preserve their phrasing; fix grammar only.",
  "solution": "1-2 paragraphs on what was done and how it fit their day-to-day. Strategy over feature-list.",
  "results": {
    "stats": [ { "value": "32%", "label": "of revenue from email" } ],
    "prose": "1-2 sentences weaving the outcome together, ending on the human payoff. Only real numbers."
  },
  "pull_quotes": ["2-3 VERBATIM quotes copied exactly from the transcript above"],
  "about_company": "2-3 sentences about ${campaign.client_name}, factual and neutral in tone.",
  "cta": "One sentence call to action for the reader to work with the consultant (not CaseForge)."
}`;

    const text = await generateText(SYSTEM_PROMPT, userPrompt, true, 'synthesis');
    const caseStudy = parseJsonResponse<CaseStudy>(text);

    // Validate the load-bearing fields rather than writing undefined downstream.
    const missing: string[] = [];
    if (!caseStudy?.title?.trim()) missing.push('title');
    if (!caseStudy?.exec_summary?.trim()) missing.push('exec_summary');
    if (!caseStudy?.problem?.trim()) missing.push('problem');
    if (!caseStudy?.solution?.trim()) missing.push('solution');
    if (missing.length > 0) {
      throw new Error(`AI response missing required field(s): ${missing.join(', ')}`);
    }

    // Normalize optional/nested shapes the model can omit.
    caseStudy.snapshot = {
      industry: caseStudy.snapshot?.industry ?? campaign.client_industry ?? '',
      size: caseStudy.snapshot?.size ?? campaign.client_size ?? '',
      headline_metric: caseStudy.snapshot?.headline_metric ?? '',
    };
    caseStudy.results = {
      stats: Array.isArray(caseStudy.results?.stats) ? caseStudy.results.stats : [],
      prose: caseStudy.results?.prose ?? '',
    };
    if (!Array.isArray(caseStudy.pull_quotes)) caseStudy.pull_quotes = [];
    caseStudy.about_company = caseStudy.about_company ?? '';
    caseStudy.cta = caseStudy.cta ?? '';

    // Keep an already-published slug stable across "Retry Processing" runs.
    const { data: existing } = await supabase
      .from('outputs')
      .select('web_slug')
      .eq('campaign_id', campaignId)
      .maybeSingle();
    const webSlug = existing?.web_slug ?? generateSlug(campaign.client_name);

    const pdfUrl = await generateAndUploadPDF(campaignId, {
      caseStudy,
      clientName: campaign.client_name,
    });

    const { error: upsertError } = await supabase.from('outputs').upsert(
      {
        campaign_id: campaignId,
        case_study: caseStudy,
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

    const { data: userData } = await supabase.auth.admin.getUserById(campaign.creator_id);
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
    const errorMessage = err instanceof Error ? err.message : 'Synthesis failed';
    console.error(`Synthesis failed for campaign ${campaignId}:`, err);
    await supabase
      .from('campaigns')
      .update({ status: 'error', error_message: errorMessage })
      .eq('id', campaignId);
    throw err;
  }
}
