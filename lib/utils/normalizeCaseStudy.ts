import type { BeforeAfter, CaseStudy, ClientQuote, NarrativeSection } from '@/lib/types';

/**
 * Coerce any stored `case_study` JSON into the current `CaseStudy` shape so the
 * renderers (PDF + public web page) never crash on schema drift. Handles two
 * known legacy shapes:
 *   - a pre-current schema (title/problem/solution/pull_quotes, snapshot &
 *     results stored as objects)
 *   - the current schema with malformed elements (e.g. a stray number in
 *     `what_we_did`)
 */
export function normalizeCaseStudy(raw: unknown): CaseStudy {
  const cs = (raw ?? {}) as Record<string, unknown>;

  const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));

  const toBeforeAfter = (v: unknown): BeforeAfter[] =>
    Array.isArray(v)
      ? v
          .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
          .map((item) => ({
            metric: str(item.metric),
            before: str(item.before),
            after: str(item.after),
          }))
      : [];

  const toQuote = (v: unknown): ClientQuote => {
    const q = (v ?? {}) as Record<string, unknown>;
    return { quote: str(q.quote), name: str(q.name), title: str(q.title) };
  };

  const toStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((item): item is string => typeof item === 'string') : [];

  const toNarrativeSections = (v: unknown): NarrativeSection[] =>
    Array.isArray(v)
      ? v
          .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
          .map((item) => {
            const quote = toQuote(item.quote);
            return {
              heading: str(item.heading),
              body: toStringArray(item.body),
              ...(quote.quote.trim() ? { quote } : {}),
            };
          })
      : [];

  // ── Legacy schema (snapshot/results are objects; uses problem/solution/pull_quotes) ──
  const isLegacy =
    (typeof cs.snapshot === 'object' && cs.snapshot !== null && !Array.isArray(cs.snapshot)) ||
    'problem' in cs ||
    'solution' in cs ||
    'pull_quotes' in cs;

  if (isLegacy) {
    const snap = (cs.snapshot ?? {}) as Record<string, unknown>;
    const industry = str(snap.industry);
    const size = str(snap.size);
    const industrySize = [industry, size].filter((s) => s.trim().length > 0).join(' · ');

    const solution = str(cs.solution);
    const pullQuotes = Array.isArray(cs.pull_quotes) ? cs.pull_quotes : [];

    return {
      client_name: str(cs.client_name),
      industry_size: industrySize,
      headline_result: str(cs.title) || str(cs.headline_result),
      snapshot: [],
      challenge: str(cs.problem),
      why_chose: '',
      provider_name: str(cs.provider_name),
      what_we_did: solution.trim() ? [solution] : [],
      results: [],
      quotes: pullQuotes
        .map((q): ClientQuote => ({ quote: str(q), name: '', title: '' }))
        .filter((q) => q.quote.trim().length > 0),
      timeline: '',
      cta: str(cs.cta),
      location: '',
      team_size: '',
      key_outcomes: [],
      narrative_sections: [],
      transformation: '',
      conclusion: '',
    };
  }

  // ── Current schema (coerce defensively) ──
  return {
    client_name: str(cs.client_name),
    industry_size: str(cs.industry_size),
    headline_result: str(cs.headline_result),
    snapshot: toBeforeAfter(cs.snapshot),
    challenge: str(cs.challenge),
    why_chose: str(cs.why_chose),
    provider_name: str(cs.provider_name),
    what_we_did: Array.isArray(cs.what_we_did)
      ? cs.what_we_did.filter((item): item is string => typeof item === 'string')
      : [],
    results: toBeforeAfter(cs.results),
    quotes: Array.isArray(cs.quotes)
      ? cs.quotes
          .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
          .map((item) => ({ quote: str(item.quote), name: str(item.name), title: str(item.title) }))
      : [],
    timeline: str(cs.timeline),
    cta: str(cs.cta),
    location: str(cs.location),
    team_size: str(cs.team_size),
    key_outcomes: toStringArray(cs.key_outcomes),
    narrative_sections: toNarrativeSections(cs.narrative_sections),
    transformation: str(cs.transformation),
    conclusion: str(cs.conclusion),
  };
}
