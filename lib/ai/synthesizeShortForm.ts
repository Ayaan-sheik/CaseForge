import type { CaseStudy } from '@/lib/types';
import { runFinalSynthesis } from './synthesisRouter';
import { parseJsonResponse } from './groq';

export interface ShortFormProps {
  caseStudy: CaseStudy;
  clientName: string;
  serviceProvided?: string;
}

type PlaceholderMap = Record<string, string>;

const DASH = '—';

function pad(arr: string[], len: number): string[] {
  const result = arr.slice(0, len);
  while (result.length < len) result.push(DASH);
  return result;
}

function splitChallenge(text: string): [string, string] {
  const w = text.trim().split(/\s+/);
  if (w.length <= 80) return [text.trim(), DASH];
  return [w.slice(0, 80).join(' '), w.slice(80).join(' ')];
}

function buildDirectMap(props: ShortFormProps): PlaceholderMap {
  const { caseStudy: cs, clientName } = props;
  const map: PlaceholderMap = {};

  map['BRAND_NAME'] = 'CaseForge';
  map['CLIENT_NAME'] = cs.client_name || clientName;
  map['CLIENT_INDUSTRY'] = cs.industry_size || DASH;
  map['TEAM_SIZE'] = cs.team_size || DASH;
  map['CLIENT_LOCATION'] = cs.location || DASH;
  map['PROJECT_TIMELINE'] = cs.timeline || DASH;

  const [p1] = splitChallenge(cs.challenge || '');
  map['CHALLENGE_PARAGRAPH_1'] = p1 || DASH;

  const quote = (cs.quotes || [])[0];
  map['CUSTOMER_QUOTE_ABOUT_STARTING_PROBLEM'] = quote?.quote || DASH;
  map['QUOTE_SOURCE'] = [quote?.name, quote?.title].filter(Boolean).join(', ') || DASH;

  // Metric cards — top 3 results
  const results = cs.results || [];
  for (let i = 0; i < 3; i++) {
    const r = results[i];
    map[`METRIC_${i + 1}_HEADING`] = r?.metric || DASH;
    map[`METRIC_${i + 1}_AFTER_VALUE`] = r?.after || DASH;
    map[`METRIC_${i + 1}_BEFORE_VALUE`] = r?.before || DASH;
    map[`METRIC_${i + 1}_TIMEFRAME`] = cs.timeline || DASH;
  }

  const outcomes = pad((cs.key_outcomes || []).filter(Boolean), 4);
  for (let i = 0; i < 4; i++) map[`KEY_OUTCOME_${i + 1}`] = outcomes[i];

  map['CLOSING_SUMMARY_PARAGRAPH'] =
    (cs.transformation && cs.transformation.trim()) ||
    (cs.conclusion && cs.conclusion.trim()) ||
    DASH;

  return map;
}

// Keys that require AI condensation/reframing — not directly available on CaseStudy
const AI_KEYS = [
  'TAG_1', 'TAG_2', 'TAG_3',
  'INDUSTRY_OR_CATEGORY', 'TEAM_SIZE_SHORT', 'PRIMARY_OUTCOME_CATEGORY',
  'CASE_STUDY_HEADLINE', 'SHORT_SUMMARY_OF_TRANSFORMATION',
  'CHALLENGE_SECTION_HEADING',
  'APPROACH_SECTION_HEADING',
  'APPROACH_CARD_1_HEADING',
  'APPROACH_CARD_2_HEADING',
  'APPROACH_CARD_3_HEADING',
] as const;

const SYSTEM_PROMPT = `You are a B2B case study writer generating concise content for a compact 1-page short-form PDF.
Use ONLY information from the provided CaseStudy JSON — never invent numbers, names, timelines, or outcomes.
Use "—" for any field with no supporting source data.
Return a JSON object with exactly the requested keys.`;

async function buildAiMap(cs: CaseStudy): Promise<PlaceholderMap> {
  const user = `Generate the following short-form case study fields from the source data below.

Required keys and length limits:
- TAG_1 to TAG_3: ≤ 20 chars each (2–3 words, e.g. "Revenue Growth")
- INDUSTRY_OR_CATEGORY: ≤ 25 chars (e.g. "Marketing Agency")
- TEAM_SIZE_SHORT: ≤ 20 chars (e.g. "12-person team")
- PRIMARY_OUTCOME_CATEGORY: ≤ 25 chars (e.g. "Lead Generation")
- CASE_STUDY_HEADLINE: ≤ 80 chars (bold outcome-first headline)
- SHORT_SUMMARY_OF_TRANSFORMATION: ≤ 130 chars (1 sentence)
- CHALLENGE_SECTION_HEADING: ≤ 55 chars (problem-focused)
- APPROACH_SECTION_HEADING: ≤ 55 chars (solution-focused)
- APPROACH_CARD_1_HEADING: ≤ 40 chars
- APPROACH_CARD_2_HEADING: ≤ 40 chars
- APPROACH_CARD_3_HEADING: ≤ 40 chars

Source data:
${JSON.stringify(cs, null, 2)}

Return a JSON object only.`;

  const { text } = await runFinalSynthesis(SYSTEM_PROMPT, user);
  const parsed = parseJsonResponse<PlaceholderMap>(text);
  if (!parsed || typeof parsed !== 'object') return {};

  const result: PlaceholderMap = {};
  for (const key of AI_KEYS) {
    const val = (parsed as Record<string, unknown>)[key];
    result[key] = typeof val === 'string' && val.trim() ? val.trim() : DASH;
  }
  return result;
}

/**
 * Build the full placeholder map for the short-form template.
 * Direct CaseStudy fields are mapped first; AI is used only for fields that
 * require condensation or reframing (headings, tags, approach cards, etc.).
 * Direct values always override AI output so factual content stays accurate.
 */
export async function synthesizeShortFormContent(props: ShortFormProps): Promise<PlaceholderMap> {
  const directMap = buildDirectMap(props);

  let aiMap: PlaceholderMap = {};
  try {
    aiMap = await buildAiMap(props.caseStudy);
  } catch (err) {
    console.error('[synthesizeShortForm] AI condensation failed, using direct map only:', err);
  }

  // Merge: direct factual values always win over AI-generated ones
  return { ...aiMap, ...directMap };
}
