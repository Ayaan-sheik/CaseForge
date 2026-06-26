import { createAdminClient } from '@/lib/supabase/server';
import { generateSlug } from '@/lib/utils/generateSlug';
import { generateAndUploadBothPDFs } from '@/lib/pdf/generatePDF';
import { sendEmail } from '@/lib/email/send';
import { outputsReadyEmail } from '@/lib/email/templates';
import type {
  AgencyContext,
  CaseStudy,
  ContentSufficiency,
  EngagementBrief,
  StoryBlocks,
  ValidatedMetric,
} from '@/lib/types';
import { prepareCaseStudyInputs, type CaseStudyInputs } from '@/lib/case-study/prepareInputs';
import { parseJsonResponse } from './groq';
import { runFinalSynthesis } from './synthesisRouter';

const SYSTEM_PROMPT = `You are generating a B2B case study as a grounded JSON object in a fixed schema. You write from STRUCTURED SOURCE DATA — validated metrics, extracted story blocks, the interview transcript, and the provider brief — never from imagination. If a required field has no support, write exactly "[NEEDS INPUT: <what's missing>]" rather than generic filler.

Source priority (highest first):
1. VALIDATED METRICS — the ONLY source for snapshot/results numbers and for any percentage. Prefer client-confirmed metrics. Never invent, recompute, or state a percentage other than the one provided.
2. STORY BLOCKS — the substance of the narrative. Build sections from before_state, pain_points, implementation_components, workflow/operational impact, quote_candidates, key_outcomes, strategic_takeaway, etc. Prefer these over the raw transcript's order.
3. RAW TRANSCRIPT — use only to preserve the client's voice and verify quote wording. Do not overfit to its messy order.
4. PROVIDER BRIEF / PROFILE — context and positioning only. Never treat agency claims or typical outcomes as proof for THIS client unless confirmed by the interview or validated metrics.

Hard rules:
- NEVER invent or extrapolate metrics, numbers, percentages, names, dates, tools, causes, or outcomes.
- Quotes must be VERBATIM (light grammar cleanup only) — copy the client's exact words from quote_candidates/transcript. Never fabricate a quote, a speaker name, or a title.
- Percentages: you must NOT calculate them. Only use a percent_change provided in VALIDATED METRICS, and if you state one it must match exactly (40,000 → 70,000 is +75%, never +10%). Before→after is often clearer than a percentage — prefer it.
- Plain, specific, human prose. No brochure language ("game-changing", "seamless", "best-in-class"). 9th-grade reading level.

Narrative depth & shape:
- Write FEWER, DEEPER sections — not many shallow ones. The CONTENT SUFFICIENCY block sets the target count; each section must add NEW grounded information.
- Section headings must be STORY-SPECIFIC when the data supports it (e.g. "From Inconsistent Posting to a Daily Content Engine"). Avoid generic labels — "Introduction", "The Challenge", "Why a Solution Was Needed", "The Solution", "Results", "Conclusion", "In Closing" — unless the data is genuinely too thin for anything specific. Never invent story details to make a heading catchy.
- Follow this arc WHEN supported, skipping any section the data can't support (never create an empty/filler section): client context/starting point → problem/old way → work implemented/approach → workflow/operational change → results & proof → strategic takeaway/closing.
- ONE closing, and it lives ONLY in the "conclusion" field. narrative_sections are body beats (context, problem/old way, the work, operational change, results & proof) — NEVER a closing, recap, "Transformation", "Conclusion", "Summary", or "Takeaway" section. The strategic takeaway belongs in the conclusion, not a section.
- A narrative_section's optional "quote" must be a verbatim quote_candidate, never reused across sections — omit the field when you have none.`;

interface InterviewTurn {
  sequence: number;
  question_text: string | null;
  transcript_clean: string | null;
}

/** Render code-validated metrics as the authoritative numbers block for the prompt. */
function renderValidatedMetrics(metrics: ValidatedMetric[]): string {
  const rows = metrics.filter((m) => m.name?.trim());
  if (rows.length === 0) return '';
  const lines = rows.map((m) => {
    const ba =
      m.before_value && m.after_value
        ? `${m.before_value} → ${m.after_value}`
        : m.before_value || m.after_value || '(value not given)';
    const unit = m.unit ? ` ${m.unit}` : '';
    const tf = m.timeframe ? ` over ${m.timeframe}` : '';
    const pct =
      m.percent_change !== undefined
        ? ` | ${m.percent_change >= 0 ? '+' : ''}${m.percent_change}% (code-computed — the ONLY percentage you may state for this metric)`
        : '';
    const status =
      m.status === 'client_confirmed'
        ? 'CLIENT-CONFIRMED'
        : m.status === 'unverified'
          ? 'UNVERIFIED'
          : 'AGENCY-CLAIMED (unconfirmed)';
    return `- ${m.name}: ${ba}${unit}${tf}${pct} [${status}]`;
  });
  return `VALIDATED METRICS (code-validated — the ONLY source for snapshot/results numbers; never invent or recompute). Prefer CLIENT-CONFIRMED; use the exact before/after values shown:\n${lines.join('\n')}`;
}

/** Render the extracted story blocks as the narrative substance block for the prompt. */
function renderStoryBlocks(b: StoryBlocks): string {
  const parts: string[] = [];
  const add = (label: string, val?: string) => {
    if (val && val.trim()) parts.push(`- ${label}: ${val.trim()}`);
  };
  const addArr = (label: string, arr?: string[]) => {
    const a = (arr ?? []).filter((x) => x && x.trim());
    if (a.length) parts.push(`- ${label}:\n${a.map((x) => `    • ${x.trim()}`).join('\n')}`);
  };
  add('Client background', b.client_background);
  add('Before state', b.before_state);
  addArr('Pain points', b.pain_points);
  add('Tried before', b.tried_before);
  add('Trigger for change', b.trigger_for_change);
  add('Why chose provider', b.why_chose_provider);
  add('Implementation summary', b.implementation_summary);
  addArr('Implementation components', b.implementation_components);
  add('Workflow change', b.workflow_change);
  add('Operational impact', b.operational_impact);
  add('Business impact', b.business_impact);
  addArr('Key outcomes', b.key_outcomes);
  add('Strategic takeaway', b.strategic_takeaway);
  const quotes = (b.quote_candidates ?? []).filter((q) => q.quote?.trim());
  if (quotes.length) {
    const qs = quotes.map((q) => {
      const attr = [q.speaker, q.role].filter(Boolean).join(', ');
      return `    • "${q.quote.trim()}"${attr ? ` — ${attr}` : ''}`;
    });
    parts.push(`- Quote candidates (verbatim — your only source for quotes):\n${qs.join('\n')}`);
  }
  if (b.missing_context_flags?.length) {
    parts.push(
      `- Missing/unsupported (write AROUND these — do NOT invent them or create filler sections for them): ${b.missing_context_flags.join(', ')}`
    );
  }
  if (parts.length === 0) return '';
  return `STORY BLOCKS (grounded extraction — write the narrative FROM these, not from raw transcript order):\n${parts.join('\n')}`;
}

/** Turn the sufficiency score into a depth-control block + the target section count. */
function depthGuidance(suff?: ContentSufficiency | null): { block: string; sectionTarget: string } {
  if (!suff) return { block: '', sectionTarget: '4-6' };
  const sectionTarget =
    suff.recommended_depth === 'long' ? '5-6' : suff.recommended_depth === 'medium' ? '4-5' : '3-4';
  const block = `CONTENT SUFFICIENCY (controls depth — long-form is EARNED by the data, never padded):
- Overall ${suff.overall} → write a ${suff.recommended_depth} case study (~${suff.recommended_pages.min}-${suff.recommended_pages.max} pages).
- Write ${sectionTarget} deeper narrative_sections. Each must add NEW grounded information. Do not pad to a page count, and do not stretch thin data.`;
  return { block, sectionTarget };
}

export interface SynthesisPromptParams {
  clientName: string;
  industrySize: string;
  clientLocation: string;
  engagementTimeline: string;
  serviceProvided: string;
  providerName: string;
  context: AgencyContext | null;
  brief: EngagementBrief | null;
  transcript: string;
  /** Phase 3 grounded artifacts — the primary writing source. */
  inputs: CaseStudyInputs | null;
}

/**
 * Build the synthesis system+user prompts. Pure + exported so the prompt can be
 * exercised/verified in isolation. Source priority: validated metrics → story
 * blocks → transcript → brief/profile. Section count is gated by content
 * sufficiency. Degrades to brief+transcript when Phase 3 inputs are unavailable.
 */
export function buildSynthesisPrompt(p: SynthesisPromptParams): { system: string; user: string } {
  const briefBlock = p.brief
    ? `Provider's brief (their own account — context/positioning only, not proof):\n- Problem: ${p.brief.problem}\n- Delivered: ${p.brief.what_delivered}\n- Outcome claimed: ${p.brief.what_changed}\n`
    : '';
  const contextBlock = p.context
    ? `About the provider: ${p.context.what_you_do}.${p.context.differentiator ? ` Differentiator: ${p.context.differentiator}.` : ''}${p.context.services?.length ? ` Services: ${p.context.services.join(', ')}.` : ''} Voice to match: ${p.context.tone}.\n`
    : '';

  const validatedBlock = p.inputs ? renderValidatedMetrics(p.inputs.validatedMetrics) : '';
  const storyBlock = p.inputs ? renderStoryBlocks(p.inputs.storyBlocks) : '';
  const { block: sufficiencyBlock, sectionTarget } = depthGuidance(p.inputs?.sufficiency);

  const user = `SOURCE DATA
Client name: ${p.clientName}
Industry + size: ${p.industrySize || 'unknown'}
Client location: ${p.clientLocation || 'unknown'}
Engagement timeline: ${p.engagementTimeline || 'unknown'}
Service provided: ${p.serviceProvided}
Provider/agency name: ${p.providerName}
${contextBlock}${briefBlock}${validatedBlock ? `\n${validatedBlock}\n` : ''}${storyBlock ? `\n${storyBlock}\n` : ''}${sufficiencyBlock ? `\n${sufficiencyBlock}\n` : ''}
Client interview transcript (for quote wording + the client's voice — the STORY BLOCKS above are the structured version of this; don't overfit to its order):
${p.transcript}

Generate the case study. Return ONLY a valid JSON object (no markdown, no preamble). Follow every rule; where the source lacks data for a required slot, write exactly "[NEEDS INPUT: <what's missing>]".

{
  "client_name": "${p.clientName}",
  "industry_size": "industry + company size if known, else [NEEDS INPUT: industry/size]",
  "headline_result": "transformation-style headline expressing before → mechanism → result (e.g. 'From Sporadic Posts to 50,000 Daily Views' or 'How a Gifting Brand Turned Daily Content Into Revenue Growth'). Use ONLY supported claims; include a metric only if it appears in VALIDATED METRICS, and prefer ONE clear metric or the mechanism over stacking several numbers. Polished and human — never generic ('A Successful Case Study').",
  "location": "client city/region if stated in the source, else empty string",
  "team_size": "client team/company size in words if stated (e.g. '20 office staff'), else empty string",
  "snapshot": [ { "metric": "what is measured", "before": "value before", "after": "value after" } ],
  "challenge": "100-150 words on the problem/old way drawn from STORY BLOCKS: what was broken or limiting growth, ONE concrete trigger, and (only if known) what they had tried before. No generic pain-point language.",
  "why_chose": "50-80 words — the specific decision factor (from why_chose_provider / transcript). If unsupported, '[NEEDS INPUT: why they chose the provider]'.",
  "provider_name": "${p.providerName}",
  "what_we_did": ["concrete steps the provider implemented (from implementation_components/summary) — actions pulled from the source, not generic descriptions"],
  "results": [ { "metric": "metric name", "before": "before value", "after": "after value" } ],
  "quotes": [ { "quote": "VERBATIM client quote", "name": "full name or empty", "title": "job title or empty" } ],
  "key_outcomes": ["short qualitative outcome bullets for the long-form results section, each one stated in or directly supported by the source"],
  "narrative_sections": [ { "heading": "specific story heading", "body": ["paragraph 1", "paragraph 2"], "quote": { "quote": "VERBATIM client quote", "name": "", "title": "" } } ],
  "transformation": "1-2 short paragraphs telling the before→after story arc (the short-form 'Transformation' section). Plain narrative, no invented facts.",
  "conclusion": "The SINGLE closing — always provide it (this is the only closing; no narrative_section may close the story). 1-2 short paragraphs that reinforce THIS client's specific before → mechanism → after. Name the client and at least one concrete detail or validated metric, plus the strategic takeaway. Write about THIS client only — never generalize to 'companies'/'businesses' or write a moral/essay ending. Banned openings/phrasings: 'This case study…', 'In conclusion…', 'Overall…', 'The engagement was a success…', 'serves as a testament…', 'the power of…', 'companies can…', 'businesses can…'. Keep it to 2-3 sentences (short and honest when data is thin). The LAST sentence MUST reference this client by name or a specific detail/number — it must NOT be a general lesson, prediction, or industry statement.",
  "timeline": "one line: time from start to the results — only if stated (e.g. a metric timeframe), else empty string",
  "cta": "one line placeholder, e.g. '[Provider contact/link]'"
}

Rules for the arrays:
- snapshot: before→after rows drawn ONLY from VALIDATED METRICS (prefer client-confirmed), using the exact before/after values + units shown. Output fewer rows rather than inventing; empty array if there are no validated metrics.
- results: same source as snapshot — only validated metrics. Empty array if none. NEVER build a metric row from a qualitative outcome, and never invent a unit or timeframe.
- quotes: up to 2-3 verbatim quotes from the quote_candidates above. Never invent a name or title — leave them "" when not stated (it renders as the client). If no usable quote exists, a single entry [{ "quote": "[NEEDS INPUT: client quote]", "name": "", "title": "" }].
- key_outcomes: 3-5 short bullets, each supported by story blocks or validated metrics. Empty array if the source is thin.
- narrative_sections: write ${sectionTarget} sections (per CONTENT SUFFICIENCY) that walk only the SUPPORTED parts of the arc — starting point, problem/old way, the work implemented, workflow/operational change, results & proof, strategic takeaway. Use story-specific headings grounded in THIS engagement (e.g. "From Inconsistent Posting to a Daily Content Engine"); skip any beat the data can't support rather than writing a filler section. Each supported section is 3-4 paragraphs, each 3-5 full sentences of plain narrative. The final narrative_section must be a substantive BODY beat (results & proof, or operational change) — NEVER a closing/recap/"Transformation"/"Conclusion"/"Summary"/"Takeaway" section (the single closing lives only in the conclusion field). Include a "quote" only when you have a real verbatim quote for that section; never reuse a quote. If the source is genuinely thin, write fewer/shorter sections — never pad with invented detail or filler.`;

  return { system: SYSTEM_PROMPT, user };
}

/**
 * Turn the cleaned interview transcript into the case study, render both the
 * short-form one-pager and the long-form (~5-page) story PDFs, and publish the
 * hosted page. Marks the campaign 'complete' on success and 'error' on failure.
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

    // ── Phase 3: grounded intermediate layer ──────────────────────────────────
    // Extract story blocks, validate metrics (code-computed %), and score content
    // sufficiency. Persisted on the output row; Phase 4 synthesis reads these from
    // the prompt and Phase 5 rendering uses them for depth. Never breaks synthesis.
    let inputs: CaseStudyInputs | null = null;
    try {
      inputs = await prepareCaseStudyInputs({
        clientName: campaign.client_name,
        serviceProvided: campaign.service_provided,
        context,
        brief: campaign.brief,
        metrics: campaign.metrics,
        transcript,
      });
    } catch (err) {
      console.error(`Case-study input prep failed for campaign ${campaignId}:`, err);
    }

    const industrySize = [campaign.client_industry, campaign.client_size]
      .filter(Boolean)
      .join(' · ');
    const clientLocation = (campaign.client_location as string | null)?.trim() || '';
    const engagementTimeline = (campaign.timeline as string | null)?.trim() || '';

    const { system, user } = buildSynthesisPrompt({
      clientName: campaign.client_name,
      industrySize,
      clientLocation,
      engagementTimeline,
      serviceProvided: campaign.service_provided,
      providerName,
      context,
      brief: campaign.brief,
      transcript,
      inputs,
    });

    const { text, provider, model } = await runFinalSynthesis(system, user);
    console.log(`Synthesis for campaign ${campaignId} used ${provider}/${model}`);
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
    caseStudy.location = caseStudy.location ?? '';
    caseStudy.team_size = caseStudy.team_size ?? '';
    caseStudy.key_outcomes = Array.isArray(caseStudy.key_outcomes) ? caseStudy.key_outcomes : [];
    caseStudy.narrative_sections = Array.isArray(caseStudy.narrative_sections)
      ? caseStudy.narrative_sections
      : [];
    caseStudy.transformation = caseStudy.transformation ?? '';
    caseStudy.conclusion = caseStudy.conclusion ?? '';

    // Keep an already-published slug stable across "Retry Processing" runs.
    const { data: existing } = await supabase
      .from('outputs')
      .select('web_slug')
      .eq('campaign_id', campaignId)
      .maybeSingle();
    const webSlug = existing?.web_slug ?? generateSlug(campaign.client_name);

    const { pdfUrl, pdfUrlLong } = await generateAndUploadBothPDFs(campaignId, {
      caseStudy,
      clientName: campaign.client_name,
      serviceProvided: campaign.service_provided,
      // Phase 5 long-form artifacts — power adaptive depth + production guards.
      storyBlocks: inputs?.storyBlocks ?? null,
      validatedMetrics: inputs?.validatedMetrics ?? null,
      contentSufficiency: inputs?.sufficiency ?? null,
      providerName,
    });

    const { error: upsertError } = await supabase.from('outputs').upsert(
      {
        campaign_id: campaignId,
        case_study: caseStudy,
        pdf_url: pdfUrl,
        pdf_url_long: pdfUrlLong,
        web_slug: webSlug,
        // Phase 3 artifacts — null when input prep failed (synthesis still succeeds).
        story_blocks: inputs?.storyBlocks ?? null,
        validated_metrics: inputs?.validatedMetrics ?? null,
        content_sufficiency: inputs?.sufficiency ?? null,
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
