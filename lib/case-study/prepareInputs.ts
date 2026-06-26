import type {
  AgencyContext,
  ContentSufficiency,
  EngagementBrief,
  StoryBlocks,
  StructuredMetric,
  ValidatedMetric,
} from '@/lib/types';
import { extractStoryBlocks } from '@/lib/ai/extractStoryBlocks';
import { validateMetrics } from './validateMetrics';
import { scoreContentSufficiency } from './contentSufficiency';

/**
 * The three grounded artifacts Phase 4 synthesis + Phase 5 rendering consume.
 * `validatedMetrics` carries code-computed percentages (never LLM math), and
 * `sufficiency` decides long-form depth so output is earned by the data.
 */
export interface CaseStudyInputs {
  storyBlocks: StoryBlocks;
  validatedMetrics: ValidatedMetric[];
  sufficiency: ContentSufficiency;
}

/** Deterministic fallback story blocks from the brief when LLM extraction fails. */
function fallbackBlocksFromBrief(brief?: EngagementBrief | null): StoryBlocks {
  const blocks: StoryBlocks = { missing_context_flags: ['story_extraction_failed'] };
  if (!brief) return blocks;
  if (brief.before_state) blocks.before_state = brief.before_state;
  if (brief.tried_before) blocks.tried_before = brief.tried_before;
  if (brief.implementation_components?.length)
    blocks.implementation_components = brief.implementation_components;
  if (brief.what_delivered) blocks.implementation_summary = brief.what_delivered;
  if (brief.key_business_change) blocks.business_impact = brief.key_business_change;
  if (brief.problem) blocks.pain_points = [brief.problem];
  if (brief.suspected_metrics?.length) blocks.key_outcomes = brief.suspected_metrics;
  return blocks;
}

export interface PrepareInputsArgs {
  clientName: string;
  serviceProvided: string;
  context?: AgencyContext | null;
  brief?: EngagementBrief | null;
  metrics?: StructuredMetric[] | null;
  transcript: string;
}

/**
 * Run the Phase 3 pipeline: extract story blocks (LLM, grounded) → validate
 * metrics (deterministic math) → score content sufficiency (deterministic).
 * Resilient: if extraction fails, falls back to brief-derived blocks so metric
 * validation + sufficiency still produce a usable result.
 */
export async function prepareCaseStudyInputs(args: PrepareInputsArgs): Promise<CaseStudyInputs> {
  let storyBlocks: StoryBlocks;
  try {
    storyBlocks = await extractStoryBlocks(args);
  } catch (err) {
    console.error('Story extraction failed — using brief-derived fallback:', err);
    storyBlocks = fallbackBlocksFromBrief(args.brief);
  }

  const validatedMetrics = validateMetrics({
    agencyMetrics: args.metrics,
    observations: storyBlocks.metric_observations,
    suspectedMetrics: args.brief?.suspected_metrics,
  });

  // Split validated metrics by confirmation for the writer's convenience.
  storyBlocks.confirmed_metrics = validatedMetrics.filter((m) => m.status === 'client_confirmed');
  storyBlocks.unconfirmed_metrics = validatedMetrics.filter((m) => m.status !== 'client_confirmed');

  const sufficiency = scoreContentSufficiency(storyBlocks, validatedMetrics);

  return { storyBlocks, validatedMetrics, sufficiency };
}
