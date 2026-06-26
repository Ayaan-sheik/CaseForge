import type {
  MetricObservation,
  StructuredMetric,
  ValidatedMetric,
} from '@/lib/types';

/**
 * Deterministic metric validation. Merges agency-entered metrics with the
 * client's transcript observations, then computes absolute/percentage change in
 * CODE (never the LLM). The computed percentage is always the source of truth —
 * if any generated prose later claims a conflicting number, downstream code
 * prefers these values (e.g. 40,000 → 70,000 is +75%, never +10%).
 */

/** Parse a human-entered value ("$4,000", "20k", "8%", "1.5M") into a number. */
export function parseMetricNumber(raw?: string): number | undefined {
  if (!raw) return undefined;
  const s = raw.trim().toLowerCase();
  // Strip currency, commas, and spaces; keep digits, sign, decimal, and k/m/b suffix.
  const cleaned = s.replace(/[,$£€\s]/g, '');
  const match = cleaned.match(/(-?\d+(?:\.\d+)?)\s*([kmb])?/);
  if (!match) return undefined;
  let n = parseFloat(match[1]);
  if (!Number.isFinite(n)) return undefined;
  const mult = match[2];
  if (mult === 'k') n *= 1e3;
  else if (mult === 'm') n *= 1e6;
  else if (mult === 'b') n *= 1e9;
  return n;
}

/** Round to at most one decimal place (75 stays 75; 74.53 → 74.5). */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Loose name match so "Daily views" and "daily views/day" line up. */
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function namesMatch(a: string, b: string): boolean {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

/** Equal by parsed number when both are numeric, else by normalized text. */
function valuesEqual(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const na = parseMetricNumber(a);
  const nb = parseMetricNumber(b);
  if (na !== undefined && nb !== undefined) return na === nb;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Compute the numeric/derived fields for a metric, mutating `validation_notes`.
 * Percentage is omitted (with a note) when `before` is zero or unparseable.
 */
function withComputedChange(metric: ValidatedMetric): ValidatedMetric {
  const notes = metric.validation_notes ?? [];
  const before = parseMetricNumber(metric.before_value);
  const after = parseMetricNumber(metric.after_value);
  metric.before_number = before;
  metric.after_number = after;

  if (before === undefined || after === undefined) {
    metric.direction = before === after ? 'unchanged' : 'unknown';
    if (metric.before_value || metric.after_value) {
      notes.push('Non-numeric before/after — percentage not computed.');
    }
    metric.validation_notes = notes;
    return metric;
  }

  metric.absolute_change = round1(after - before);
  metric.direction = after > before ? 'increase' : after < before ? 'decrease' : 'unchanged';

  if (before === 0) {
    notes.push('Before value is 0 — percentage change is undefined.');
  } else {
    metric.percent_change = round1(((after - before) / before) * 100);
    const sign = metric.percent_change >= 0 ? '+' : '';
    notes.push(
      `Computed ${sign}${metric.percent_change}% (${metric.before_value} → ${metric.after_value}).`
    );
  }
  metric.validation_notes = notes;
  return metric;
}

/** Seed a ValidatedMetric from an agency-entered StructuredMetric. */
function fromAgency(m: StructuredMetric): ValidatedMetric {
  return {
    ...m,
    status: m.status ?? 'agency_claimed',
    source: m.source ?? 'campaign_builder',
    validation_notes: [],
  };
}

/**
 * Conservatively parse a free-text suspected-metric string ("followers went
 * from 4,000 to 20,000") into a structured metric. Returns undefined when it
 * can't find a clear before→after pair (we never guess).
 */
export function parseSuspectedMetric(text: string): StructuredMetric | undefined {
  const t = text.trim();
  if (!t) return undefined;
  // "<name> ... <before> (to|→|->|–|-) <after>"  — values may carry %/$/commas/k.
  const m = t.match(
    /^(.*?)[:\-—]?\s*(?:from\s+)?([$£€]?\d[\d,.]*\s*[kmb%]?)\s*(?:to|→|->|–|—|-)\s*([$£€]?\d[\d,.]*\s*[kmb%]?)/i
  );
  if (!m) return undefined;
  const name = m[1].replace(/\b(went|grew|increased|rose|jumped|from)\b/gi, '').trim() || 'Metric';
  const before = m[2].trim();
  const after = m[3].trim();
  if (parseMetricNumber(before) === undefined || parseMetricNumber(after) === undefined) {
    return undefined;
  }
  return { name, before_value: before, after_value: after, status: 'unverified', source: 'campaign_builder' };
}

export interface ValidateMetricsInput {
  /** Structured metrics entered by the agency in the builder. */
  agencyMetrics?: StructuredMetric[] | null;
  /** Raw metric signals the story extractor pulled from the transcript. */
  observations?: MetricObservation[] | null;
  /** Free-text outcome claims from the brief (parsed conservatively). */
  suspectedMetrics?: string[] | null;
}

/**
 * Merge all metric sources into one validated set with code-computed change.
 * Client transcript evidence wins over agency claims on conflict.
 */
export function validateMetrics(input: ValidateMetricsInput): ValidatedMetric[] {
  const result: ValidatedMetric[] = (input.agencyMetrics ?? [])
    .filter((m) => m?.name?.trim())
    .map(fromAgency);

  // Fold in conservatively-parsed suspected metrics that aren't already present.
  for (const text of input.suspectedMetrics ?? []) {
    const parsed = parseSuspectedMetric(text);
    if (!parsed) continue;
    if (result.some((r) => namesMatch(r.name, parsed.name))) continue;
    result.push(fromAgency(parsed));
  }

  // Apply transcript observations: confirm, correct, or add client-only metrics.
  for (const obs of input.observations ?? []) {
    if (!obs?.name?.trim()) continue;
    const existing = result.find((r) => namesMatch(r.name, obs.name));

    if (existing) {
      const notes = existing.validation_notes ?? [];
      const clientBefore = obs.before_value?.trim();
      const clientAfter = obs.after_value?.trim();
      // A real correction = the client's NUMBER differs (formatting like "$40,000"
      // vs "40,000" is not a correction).
      const corrected =
        obs.corrected ||
        Boolean(clientBefore && existing.before_value && !valuesEqual(clientBefore, existing.before_value)) ||
        Boolean(clientAfter && existing.after_value && !valuesEqual(clientAfter, existing.after_value));

      if (corrected && (clientBefore || clientAfter)) {
        notes.push(
          `Client corrected: ${existing.before_value ?? '?'} → ${existing.after_value ?? '?'} became ${clientBefore ?? existing.before_value ?? '?'} → ${clientAfter ?? existing.after_value ?? '?'}.`
        );
        if (clientBefore) existing.before_value = clientBefore;
        if (clientAfter) existing.after_value = clientAfter;
        existing.status = 'client_confirmed';
        existing.source = 'client_interview';
      } else if (obs.client_stated) {
        notes.push('Confirmed by the client in the interview.');
        existing.status = 'client_confirmed';
      }
      if (obs.timeframe && !existing.timeframe) existing.timeframe = obs.timeframe;
      if (obs.note) notes.push(obs.note);
      existing.validation_notes = notes;
    } else if (obs.client_stated || obs.before_value || obs.after_value) {
      result.push({
        name: obs.name.trim(),
        before_value: obs.before_value?.trim(),
        after_value: obs.after_value?.trim(),
        unit: obs.unit?.trim(),
        timeframe: obs.timeframe?.trim(),
        status: obs.client_stated ? 'client_confirmed' : 'unverified',
        source: 'client_interview',
        validation_notes: obs.note ? [obs.note] : [],
      });
    }
  }

  return result.map(withComputedChange);
}
