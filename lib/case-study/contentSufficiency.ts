import type {
  ContentSufficiency,
  StoryBlocks,
  SufficiencyDimensions,
  SufficiencyLevel,
  ValidatedMetric,
} from '@/lib/types';

/**
 * Deterministic content-sufficiency scoring. Reads the extracted StoryBlocks +
 * code-validated metrics and decides how deep the long-form case study should
 * be. Long-form is EARNED by the data: weak content yields a shorter editorial
 * piece (2-3 pages) rather than a padded 5-pager.
 */

const POINTS: Record<SufficiencyLevel, number> = { strong: 3, medium: 2, weak: 1, missing: 0 };

const isFilled = (s?: string): boolean => Boolean(s && s.trim());
const len = (s?: string): number => (s ? s.trim().length : 0);

/** Length-based proxy for how detailed a free-text block is. */
function textLevel(text: string | undefined, mediumLen: number, strongLen: number): SufficiencyLevel {
  const n = len(text);
  if (n === 0) return 'missing';
  if (n < mediumLen) return 'weak';
  if (n < strongLen) return 'medium';
  return 'strong';
}

function numericMetrics(metrics: ValidatedMetric[]): ValidatedMetric[] {
  return metrics.filter((m) => m.before_number !== undefined && m.after_number !== undefined);
}

function scoreMetrics(metrics: ValidatedMetric[]): SufficiencyLevel {
  if (metrics.length === 0) return 'missing';
  const numeric = numericMetrics(metrics);
  const confirmed = numeric.filter((m) => m.status === 'client_confirmed');
  if (numeric.length >= 2 && (confirmed.length >= 1 || numeric.length >= 3)) return 'strong';
  if (numeric.length >= 1) return 'medium';
  return 'weak';
}

function scorePain(points: string[] | undefined): SufficiencyLevel {
  const list = (points ?? []).filter(isFilled);
  if (list.length === 0) return 'missing';
  const total = list.reduce((s, p) => s + p.trim().length, 0);
  if (list.length >= 2 && total >= 120) return 'strong';
  if (list.length >= 1 && total >= 40) return 'medium';
  return 'weak';
}

function scoreImplementation(blocks: StoryBlocks): SufficiencyLevel {
  const components = (blocks.implementation_components ?? []).filter(isFilled);
  const summaryLen = len(blocks.implementation_summary);
  if (components.length >= 3 || summaryLen >= 150) return 'strong';
  if (components.length >= 1 || summaryLen >= 60) return 'medium';
  if (summaryLen > 0 || components.length > 0) return 'weak';
  return 'missing';
}

function scoreOperational(blocks: StoryBlocks): SufficiencyLevel {
  const combined = len(blocks.operational_impact) + len(blocks.workflow_change) + len(blocks.business_impact);
  if (combined === 0) return 'missing';
  if (combined >= 140) return 'strong';
  if (combined >= 50) return 'medium';
  return 'weak';
}

function scoreQuotes(blocks: StoryBlocks): SufficiencyLevel {
  const quotes = (blocks.quote_candidates ?? []).filter((q) => isFilled(q?.quote));
  if (quotes.length === 0) return 'missing';
  const good = quotes.filter((q) => q.quote.trim().length >= 40);
  if (good.length >= 2) return 'strong';
  if (good.length >= 1 || quotes.length >= 2) return 'medium';
  return 'weak';
}

function scoreTimeline(metrics: ValidatedMetric[], blocks: StoryBlocks): SufficiencyLevel {
  const hasMetricTimeframe = metrics.some((m) => isFilled(m.timeframe));
  const mentionsTime = (blocks.evidence_notes ?? []).some((n) => /\b(week|month|year|day|quarter)s?\b/i.test(n));
  if (hasMetricTimeframe) return 'strong';
  if (mentionsTime) return 'medium';
  return 'missing';
}

function scoreProof(metrics: ValidatedMetric[]): SufficiencyLevel {
  if (metrics.length === 0) return 'weak';
  const numeric = numericMetrics(metrics);
  const confirmed = numeric.filter((m) => m.status === 'client_confirmed');
  if (confirmed.length >= 2 || (confirmed.length >= 1 && numeric.length >= 2)) return 'strong';
  if (confirmed.length >= 1 || numeric.length >= 1) return 'medium';
  return 'weak';
}

/** Map a 'missing' dimension to its flag name for missing_context_flags. */
const FLAG_NAME: Partial<Record<keyof SufficiencyDimensions, string>> = {
  metrics_strength: 'metrics',
  before_state_detail: 'before_state',
  pain_specificity: 'pain',
  implementation_detail: 'implementation_detail',
  operational_impact: 'operational_impact',
  quote_quality: 'quote',
  timeline_availability: 'timeline',
  client_background: 'client_background',
  proof_confidence: 'proof',
};

const REASON_TEXT: Record<keyof SufficiencyDimensions, Partial<Record<SufficiencyLevel, string>>> = {
  metrics_strength: {
    strong: 'Multiple before/after metrics available',
    medium: 'At least one before/after metric available',
    weak: 'Metrics present but no clean before/after numbers',
    missing: 'No structured metrics',
  },
  before_state_detail: {
    strong: 'Rich before-state detail',
    medium: 'Some before-state detail',
    weak: 'Before-state is thin',
    missing: 'Before-state is missing',
  },
  pain_specificity: {
    strong: 'Specific pain points captured',
    medium: 'Some pain detail captured',
    weak: 'Pain is vague',
    missing: 'No pain points captured',
  },
  implementation_detail: {
    strong: 'Concrete implementation components captured',
    medium: 'Implementation details are present but shallow',
    weak: 'Implementation detail is thin',
    missing: 'No implementation detail',
  },
  operational_impact: {
    strong: 'Clear operational/workflow impact',
    medium: 'Some operational impact captured',
    weak: 'Operational impact is vague',
    missing: 'No operational impact captured',
  },
  quote_quality: {
    strong: 'Strong quote material available',
    medium: 'Usable quote material available',
    weak: 'Only a weak quote available',
    missing: 'No quotes available',
  },
  timeline_availability: {
    strong: 'Timeframe available',
    medium: 'Timeframe loosely referenced',
    weak: 'Timeframe is unclear',
    missing: 'Timeline is missing',
  },
  client_background: {
    strong: 'Solid client background',
    medium: 'Some client background',
    weak: 'Client background is thin',
    missing: 'Client background is missing',
  },
  proof_confidence: {
    strong: 'Claims are client-confirmed',
    medium: 'Some proof, partly unconfirmed',
    weak: 'Claims largely unconfirmed',
    missing: 'No proof captured',
  },
};

// Heavier weights for the dimensions that most determine whether long-form is earned.
const WEIGHTS: Record<keyof SufficiencyDimensions, number> = {
  metrics_strength: 2,
  proof_confidence: 2,
  implementation_detail: 2,
  quote_quality: 2,
  before_state_detail: 1,
  pain_specificity: 1,
  operational_impact: 1,
  timeline_availability: 1,
  client_background: 1,
};

export function scoreContentSufficiency(
  blocks: StoryBlocks,
  validatedMetrics: ValidatedMetric[]
): ContentSufficiency {
  const dimensions: SufficiencyDimensions = {
    metrics_strength: scoreMetrics(validatedMetrics),
    before_state_detail: textLevel(blocks.before_state, 50, 120),
    pain_specificity: scorePain(blocks.pain_points),
    implementation_detail: scoreImplementation(blocks),
    operational_impact: scoreOperational(blocks),
    quote_quality: scoreQuotes(blocks),
    timeline_availability: scoreTimeline(validatedMetrics, blocks),
    client_background: textLevel(blocks.client_background, 50, 120),
    proof_confidence: scoreProof(validatedMetrics),
  };

  const keys = Object.keys(dimensions) as (keyof SufficiencyDimensions)[];
  let score = 0;
  let maxScore = 0;
  for (const k of keys) {
    score += POINTS[dimensions[k]] * WEIGHTS[k];
    maxScore += POINTS.strong * WEIGHTS[k];
  }
  const ratio = maxScore > 0 ? score / maxScore : 0;

  const overall: ContentSufficiency['overall'] =
    ratio >= 0.6 ? 'strong' : ratio >= 0.38 ? 'medium' : 'weak';

  const depthMap = {
    strong: { recommended_depth: 'long' as const, recommended_pages: { min: 5, max: 6 } },
    medium: { recommended_depth: 'medium' as const, recommended_pages: { min: 3, max: 4 } },
    weak: { recommended_depth: 'short' as const, recommended_pages: { min: 2, max: 3 } },
  }[overall];

  const reasons: string[] = [];
  for (const k of keys) {
    const r = REASON_TEXT[k][dimensions[k]];
    if (r) reasons.push(r);
  }

  const flags = new Set<string>(blocks.missing_context_flags ?? []);
  for (const k of keys) {
    if (dimensions[k] === 'missing') {
      const f = FLAG_NAME[k];
      if (f) flags.add(f);
    }
  }

  return {
    overall,
    ...depthMap,
    dimensions,
    reasons,
    missing_context_flags: Array.from(flags),
  };
}
