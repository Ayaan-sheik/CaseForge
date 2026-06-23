import { createAdminClient } from '@/lib/supabase/server';
import { generateSlug } from '@/lib/utils/generateSlug';
import { generateAndUploadPDF } from '@/lib/pdf/generatePDF';
import { sendEmail } from '@/lib/email/send';
import { outputsReadyEmail } from '@/lib/email/templates';
import type { AgencyContext, CaseStudy } from '@/lib/types';
import { generateText, parseJsonResponse } from './groq';

const SYSTEM_PROMPT = `You are generating a B2B case study in a fixed format. You must NOT invent facts, metrics, quotes, or details that are not present in the SOURCE DATA provided. If a required field has no supporting data, write exactly: [NEEDS INPUT: <what's missing>] in that slot — do not fill it with generic language.

Hard rules:
- NEVER invent or extrapolate metrics, numbers, or outcomes. Only use numbers explicitly stated in the source. Never estimate, round generously, or extrapolate a number that wasn't given.
- Quotes must be VERBATIM from the client's interview transcript — copy their exact words (light grammar cleanup only, no rewriting for punchiness). Do not polish, combine, or paraphrase.
- THE CHALLENGE must include ONE specific, concrete trigger event or situation (a scaling event, a deadline, a failure point). Do NOT write generic pain-point language like "they were struggling with inefficiency." If the source is vague, write the most specific version possible and flag what's missing with [NEEDS INPUT: …].
- WHAT WE DID must be concrete action steps pulled literally from the transcript's description of the process — do not generalize steps the source didn't mention.
- Avoid brochure language and hype ("game-changing", "seamless", "best-in-class", "revolutionary"). Plain, specific, human. 9th-grade reading level.`;

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
      .select('context, company_name')
      .eq('id', campaign.creator_id)
      .maybeSingle();
    const context = (profile?.context as AgencyContext | null) ?? null;
    const providerName =
      (profile?.company_name as string | null)?.trim() || '[NEEDS INPUT: provider/agency name]';

    const transcript = answered
      .map((t) => `Q: ${t.question_text ?? ''}\nA: ${t.transcript_clean}`)
      .join('\n\n');

    const industrySize = [campaign.client_industry, campaign.client_size]
      .filter(Boolean)
      .join(' · ');

    const briefBlock = campaign.brief
      ? `Provider's brief (their own account of the engagement):\n- Problem: ${campaign.brief.problem}\n- Delivered: ${campaign.brief.what_delivered}\n- Outcome claimed: ${campaign.brief.what_changed}\n`
      : '';
    const contextBlock = context
      ? `About the provider: ${context.what_you_do}. Voice to match: ${context.tone}.\n`
      : '';

    const userPrompt = `SOURCE DATA
Client name: ${campaign.client_name}
Industry + size: ${industrySize || 'unknown'}
Service provided: ${campaign.service_provided}
Provider/agency name: ${providerName}
${contextBlock}${briefBlock}
End-user/client interview transcript (the client's own words — the primary source for quotes, results, and why they chose the provider):
${transcript}

Generate the 9-section case study. Return ONLY a valid JSON object (no markdown, no preamble). Follow every rule; where the source lacks data for a required slot, write exactly "[NEEDS INPUT: <what's missing>]".

{
  "client_name": "${campaign.client_name}",
  "industry_size": "industry + company size if known, else [NEEDS INPUT: industry/size]",
  "headline_result": "§1 one-line headline result — the single most impressive number/outcome stated in the source",
  "snapshot": [ { "metric": "what is measured", "before": "value before", "after": "value after" } ],
  "challenge": "§3 100-150 words. MUST include one specific, concrete trigger event or situation. No generic pain-point language.",
  "why_chose": "§4 50-80 words. The specific decision factor — what made them pick this provider over alternatives. Paraphrase or short quote if available.",
  "provider_name": "${providerName}",
  "what_we_did": ["§5 numbered action steps, each an action pulled literally from the transcript — not a description"],
  "results": [ { "metric": "metric name", "before": "before value", "after": "after value" } ],
  "quotes": [ { "quote": "VERBATIM client quote", "name": "full name", "title": "job title" } ],
  "timeline": "§8 one line: time from start to the results above — only if explicitly stated, else empty string",
  "cta": "§9 one line placeholder, e.g. '[Provider contact/link]'"
}

Rules for the arrays:
- snapshot: 3-4 before→after rows, numbers only. If fewer than 3 real metrics exist, output fewer rows rather than inventing more.
- results: only metrics explicitly stated in the source. Empty array if none.
- quotes: up to 3 verbatim quotes. If no usable quote exists, use a single entry [{ "quote": "[NEEDS INPUT: client quote]", "name": "", "title": "" }].`;

    const text = await generateText(SYSTEM_PROMPT, userPrompt, true, 'synthesis');
    const caseStudy = parseJsonResponse<CaseStudy>(text);

    // Validate the load-bearing fields rather than writing undefined downstream.
    const missing: string[] = [];
    if (!caseStudy?.client_name?.trim()) missing.push('client_name');
    if (!caseStudy?.headline_result?.trim()) missing.push('headline_result');
    if (!caseStudy?.challenge?.trim()) missing.push('challenge');
    if (!Array.isArray(caseStudy?.what_we_did) || caseStudy.what_we_did.length === 0) {
      missing.push('what_we_did');
    }
    if (missing.length > 0) {
      throw new Error(`AI response missing required field(s): ${missing.join(', ')}`);
    }

    // Normalize optional/nested shapes the model can omit.
    caseStudy.client_name = caseStudy.client_name ?? campaign.client_name;
    caseStudy.industry_size = caseStudy.industry_size ?? industrySize ?? '';
    caseStudy.snapshot = Array.isArray(caseStudy.snapshot) ? caseStudy.snapshot : [];
    caseStudy.why_chose = caseStudy.why_chose ?? '';
    caseStudy.provider_name = caseStudy.provider_name ?? providerName;
    caseStudy.what_we_did = Array.isArray(caseStudy.what_we_did) ? caseStudy.what_we_did : [];
    caseStudy.results = Array.isArray(caseStudy.results) ? caseStudy.results : [];
    caseStudy.quotes = Array.isArray(caseStudy.quotes) ? caseStudy.quotes : [];
    caseStudy.timeline = caseStudy.timeline ?? '';
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
      serviceProvided: campaign.service_provided,
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
