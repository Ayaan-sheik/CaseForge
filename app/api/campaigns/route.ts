import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateQuestions } from '@/lib/ai/generateQuestions';
import { summarizeBrief, type PremiumBriefFields } from '@/lib/ai/buildBrief';
import type { AgencyContext, CaseStudyMode, StructuredMetric } from '@/lib/types';

/**
 * Normalize the agency-entered metric rows from the builder into StructuredMetric
 * objects. Drops rows with no name; trims values; stamps every row agency_claimed
 * (the interview can later confirm/correct them).
 */
function normalizeMetrics(raw: unknown): StructuredMetric[] {
  if (!Array.isArray(raw)) return [];
  const out: StructuredMetric[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const get = (k: string) => (typeof row[k] === 'string' ? (row[k] as string).trim() : '');
    const name = get('name');
    if (!name) continue;
    const metric: StructuredMetric = { name, status: 'agency_claimed', source: 'campaign_builder' };
    const before = get('before_value');
    const after = get('after_value');
    const unit = get('unit');
    const timeframe = get('timeframe');
    if (before) metric.before_value = before;
    if (after) metric.after_value = after;
    if (unit) metric.unit = unit;
    if (timeframe) metric.timeframe = timeframe;
    out.push(metric);
  }
  return out;
}

/**
 * POST /api/campaigns
 * Body: {
 *   clientName, clientIndustry, clientSize, clientLocation, timeline,
 *   caseStudyMode: 'standard' | 'premium_long_form',
 *   briefAnswers: { problem, what_delivered, what_changed,
 *                   before_state?, tried_before?, key_business_change?,
 *                   expected_results_to_verify? },
 *   implementationComponents?: string[],
 *   metrics?: StructuredMetric[]
 * }
 * Structures the engagement brief, generates core questions grounded in the
 * creator's global context + brief, and creates a draft campaign.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const clientName = typeof body?.clientName === 'string' ? body.clientName.trim() : '';
  const clientIndustry =
    typeof body?.clientIndustry === 'string' ? body.clientIndustry.trim() : '';
  const clientSize = typeof body?.clientSize === 'string' ? body.clientSize.trim() : '';
  const clientLocation =
    typeof body?.clientLocation === 'string' ? body.clientLocation.trim() : '';
  const timeline = typeof body?.timeline === 'string' ? body.timeline.trim() : '';
  const caseStudyMode: CaseStudyMode =
    body?.caseStudyMode === 'premium_long_form' ? 'premium_long_form' : 'standard';
  const briefAnswers =
    body?.briefAnswers && typeof body.briefAnswers === 'object' ? body.briefAnswers : null;

  if (!clientName || !briefAnswers) {
    return NextResponse.json(
      { error: 'clientName and briefAnswers are required' },
      { status: 400 }
    );
  }

  // Premium long-form extras (ignored in standard mode).
  const premiumFields: PremiumBriefFields | undefined =
    caseStudyMode === 'premium_long_form'
      ? {
          before_state: briefAnswers.before_state,
          tried_before: briefAnswers.tried_before,
          key_business_change: briefAnswers.key_business_change,
          expected_results_to_verify: briefAnswers.expected_results_to_verify,
          implementation_components: Array.isArray(body?.implementationComponents)
            ? body.implementationComponents
            : undefined,
        }
      : undefined;
  const metrics =
    caseStudyMode === 'premium_long_form' ? normalizeMetrics(body?.metrics) : [];

  // Global agency context (best-effort — questions still work without it).
  const { data: profile } = await supabase
    .from('profiles')
    .select('context')
    .eq('id', user.id)
    .single();
  const context = (profile?.context as AgencyContext | null) ?? null;

  let brief;
  let questions;
  try {
    brief = await summarizeBrief(briefAnswers as Record<string, string>, premiumFields);
    const serviceProvided = brief.what_delivered || 'their service';
    questions = await generateQuestions(
      clientName,
      serviceProvided,
      context,
      brief,
      caseStudyMode,
      metrics
    );
  } catch (err) {
    console.error('Brief/question generation failed:', err);
    return NextResponse.json(
      { error: 'Could not build the campaign — please try again' },
      { status: 502 }
    );
  }

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert({
      creator_id: user.id,
      client_name: clientName,
      service_provided: brief.what_delivered || 'their service',
      client_industry: clientIndustry || null,
      client_size: clientSize || null,
      client_location: clientLocation || null,
      timeline: timeline || null,
      case_study_mode: caseStudyMode,
      metrics,
      brief,
      status: 'draft',
      questions,
    })
    .select()
    .single();

  if (error || !campaign) {
    console.error('Campaign insert failed:', error);
    return NextResponse.json({ error: 'Could not create campaign' }, { status: 500 });
  }

  return NextResponse.json({
    campaignId: campaign.id,
    questions,
    magicToken: campaign.magic_token,
  });
}
