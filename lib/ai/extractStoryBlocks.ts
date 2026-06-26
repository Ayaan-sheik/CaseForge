import type {
  AgencyContext,
  EngagementBrief,
  MetricObservation,
  QuoteCandidate,
  StoryBlocks,
  StructuredMetric,
} from '@/lib/types';
import { generateText, parseJsonResponse } from './groq';

const SYSTEM_PROMPT = `You are a meticulous case-study researcher. You read a client engagement's source data (provider context, the provider's brief, agency-entered metrics, and the client's interview transcript) and extract STRUCTURED STORY BLOCKS that a writer will later turn into a case study.

Hard rules:
- Use ONLY the provided source data. NEVER invent or infer metrics, numbers, percentages, timelines, tools, names, causes, or outcomes that are not present.
- The client interview transcript is the strongest evidence. When the transcript conflicts with the provider's brief or agency-entered metrics, prefer the transcript and note it.
- Treat agency-entered metrics as UNCONFIRMED. Only mark a metric as client_stated=true if the CLIENT clearly states or confirms it in the transcript; set corrected=true if the client gives a different value than the agency claimed.
- Quote candidates must be VERBATIM from the transcript (light grammar cleanup only). Never fabricate a quote. Include speaker/role only if stated.
- If a block has no support in the source, leave it empty and add a short note to missing_context_flags. Do not pad.
- You do NOT compute percentages or do math — only report the values as stated.`;

function contextLines(context?: AgencyContext | null): string {
  if (!context) return '';
  const lines = [`Provider: ${context.what_you_do}`];
  if (context.services?.length) lines.push(`Services: ${context.services.join(', ')}`);
  if (context.differentiator) lines.push(`Differentiator: ${context.differentiator}`);
  return lines.join('\n');
}

function briefLines(brief?: EngagementBrief | null): string {
  if (!brief) return '';
  const lines = [
    `Problem (provider's account): ${brief.problem}`,
    `Delivered: ${brief.what_delivered}`,
    `Outcome claimed: ${brief.what_changed}`,
  ];
  if (brief.before_state) lines.push(`Before state: ${brief.before_state}`);
  if (brief.tried_before) lines.push(`Tried before: ${brief.tried_before}`);
  if (brief.implementation_components?.length)
    lines.push(`Implementation components: ${brief.implementation_components.join('; ')}`);
  if (brief.key_business_change) lines.push(`Key business change: ${brief.key_business_change}`);
  if (brief.expected_results_to_verify)
    lines.push(`Results to verify: ${brief.expected_results_to_verify}`);
  if (brief.suspected_metrics?.length)
    lines.push(`Suspected metrics: ${brief.suspected_metrics.join('; ')}`);
  return lines.join('\n');
}

function metricLines(metrics?: StructuredMetric[] | null): string {
  if (!metrics?.length) return '';
  return metrics
    .map((m) => {
      const ba =
        m.before_value && m.after_value
          ? `${m.before_value} → ${m.after_value}`
          : m.before_value || m.after_value || '';
      return `- ${m.name}${ba ? `: ${ba}` : ''}${m.unit ? ` ${m.unit}` : ''}${m.timeframe ? ` over ${m.timeframe}` : ''} [agency-claimed — confirm against transcript]`;
    })
    .join('\n');
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(str).filter(Boolean) : [];

function toObservations(v: unknown): MetricObservation[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((o): MetricObservation | null => {
      if (!o || typeof o !== 'object') return null;
      const row = o as Record<string, unknown>;
      const name = str(row.name);
      if (!name) return null;
      return {
        name,
        before_value: str(row.before_value) || undefined,
        after_value: str(row.after_value) || undefined,
        unit: str(row.unit) || undefined,
        timeframe: str(row.timeframe) || undefined,
        client_stated: Boolean(row.client_stated),
        corrected: Boolean(row.corrected),
        note: str(row.note) || undefined,
      };
    })
    .filter((o): o is MetricObservation => o !== null);
}

function toQuotes(v: unknown): QuoteCandidate[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((q): QuoteCandidate | null => {
      if (!q || typeof q !== 'object') return null;
      const row = q as Record<string, unknown>;
      const quote = str(row.quote);
      if (!quote) return null;
      return {
        quote,
        speaker: str(row.speaker) || undefined,
        role: str(row.role) || undefined,
        theme: str(row.theme) || undefined,
      };
    })
    .filter((q): q is QuoteCandidate => q !== null);
}

/** Coerce the model's raw JSON into a clean StoryBlocks (drops empties/garbage). */
function normalize(raw: Partial<StoryBlocks> | null): StoryBlocks {
  const r = (raw ?? {}) as Record<string, unknown>;
  const blocks: StoryBlocks = {
    client_background: str(r.client_background) || undefined,
    before_state: str(r.before_state) || undefined,
    pain_points: strArray(r.pain_points),
    tried_before: str(r.tried_before) || undefined,
    trigger_for_change: str(r.trigger_for_change) || undefined,
    why_chose_provider: str(r.why_chose_provider) || undefined,
    implementation_summary: str(r.implementation_summary) || undefined,
    implementation_components: strArray(r.implementation_components),
    workflow_change: str(r.workflow_change) || undefined,
    operational_impact: str(r.operational_impact) || undefined,
    business_impact: str(r.business_impact) || undefined,
    metric_observations: toObservations(r.metric_observations),
    quote_candidates: toQuotes(r.quote_candidates),
    key_outcomes: strArray(r.key_outcomes),
    strategic_takeaway: str(r.strategic_takeaway) || undefined,
    missing_context_flags: strArray(r.missing_context_flags),
    evidence_notes: strArray(r.evidence_notes),
  };
  return blocks;
}

export interface ExtractStoryBlocksArgs {
  clientName: string;
  serviceProvided: string;
  context?: AgencyContext | null;
  brief?: EngagementBrief | null;
  metrics?: StructuredMetric[] | null;
  transcript: string;
}

/**
 * Extract grounded, structured story blocks from the engagement source data +
 * client transcript. The intermediate layer between transcript and synthesis —
 * keeps long-form sections specific and lets metric validation / sufficiency
 * scoring work off structured signals. Invents nothing.
 */
export async function extractStoryBlocks(args: ExtractStoryBlocksArgs): Promise<StoryBlocks> {
  const { clientName, serviceProvided, context, brief, metrics, transcript } = args;

  const ctx = contextLines(context);
  const briefBlock = briefLines(brief);
  const metricsBlock = metricLines(metrics);

  const userPrompt = `SOURCE DATA
Client: ${clientName}
Service provided: ${serviceProvided}
${ctx ? `\nProvider context:\n${ctx}\n` : ''}${briefBlock ? `\nProvider's brief:\n${briefBlock}\n` : ''}${
    metricsBlock ? `\nAgency-entered metrics (UNCONFIRMED until the client verifies):\n${metricsBlock}\n` : ''
  }
Client interview transcript (strongest evidence):
${transcript || '(no transcript)'}

Extract the story blocks. Return ONLY a JSON object (no markdown, no preamble). Use only the source above. Leave any unsupported field empty and add it to missing_context_flags.

{
  "client_background": "who the client is — industry, size, what they do (only if stated)",
  "before_state": "what the client was doing before this engagement",
  "pain_points": ["specific friction/problems with the old way"],
  "tried_before": "what they had already tried and why it fell short",
  "trigger_for_change": "what made them realise something had to change",
  "why_chose_provider": "why they chose this provider/solution",
  "implementation_summary": "what the provider actually did, in plain terms",
  "implementation_components": ["distinct components/steps that were implemented"],
  "workflow_change": "what changed in their day-to-day workflow",
  "operational_impact": "team/operational impact (e.g. a task removed from someone's plate)",
  "business_impact": "the most important business-level change",
  "metric_observations": [
    { "name": "metric", "before_value": "value", "after_value": "value", "unit": "unit", "timeframe": "period", "client_stated": true, "corrected": false, "note": "only if the client said something notable about it" }
  ],
  "quote_candidates": [
    { "quote": "VERBATIM client sentence worth quoting", "speaker": "name if stated", "role": "title if stated", "theme": "which block it supports" }
  ],
  "key_outcomes": ["short qualitative outcome bullets supported by the source"],
  "strategic_takeaway": "the one strategic lesson this engagement illustrates",
  "missing_context_flags": ["names of blocks with no support in the source"],
  "evidence_notes": ["short notes on conflicts/uncertainty, e.g. 'agency claimed X but client said Y'"]
}

For metric_observations: include ONLY metrics the client actually mentioned in the transcript. Set client_stated=true when the client states/confirms the value; corrected=true (with the client's value) when they give a different number than the agency claimed. Do not list agency metrics the client never addressed.`;

  const text = await generateText(SYSTEM_PROMPT, userPrompt, true, 'synthesis');
  const raw = parseJsonResponse<Partial<StoryBlocks>>(text);
  return normalize(raw);
}
