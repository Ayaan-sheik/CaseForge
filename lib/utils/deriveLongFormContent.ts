import { isFilled } from '@/lib/utils/isFilled';
import type { CaseStudy, ClientQuote, NarrativeSection } from '@/lib/types';

/**
 * Build long-form story content from a case study's existing structured fields,
 * for use when the LLM-written narrative is absent (e.g. a case study generated
 * before the long-form fields existed) or empty.
 *
 * This invents nothing: it only re-arranges text already present on `cs`
 * (challenge, why_chose, what_we_did, results, transformation, quotes) into
 * narrative sections so the long-form PDF is a faithful multi-page document
 * instead of a near-empty single page.
 */
export function deriveLongFormContent(cs: CaseStudy): {
  narrative_sections: NarrativeSection[];
  key_outcomes: string[];
  conclusion: string;
} {
  const provider = isFilled(cs.provider_name) ? cs.provider_name : 'the provider';
  const quotes = (cs.quotes ?? []).filter((q) => isFilled(q.quote));
  let quoteIdx = 0;
  const nextQuote = (): ClientQuote | undefined =>
    quoteIdx < quotes.length ? quotes[quoteIdx++] : undefined;

  const sections: NarrativeSection[] = [];

  if (isFilled(cs.challenge)) {
    sections.push({
      heading: 'The Challenge',
      body: [cs.challenge],
      quote: nextQuote(),
    });
  }

  if (isFilled(cs.why_chose)) {
    sections.push({
      heading: `Why They Chose ${provider}`,
      body: [cs.why_chose],
    });
  }

  const steps = (cs.what_we_did ?? []).filter(isFilled);
  if (steps.length > 0) {
    sections.push({
      heading: `What ${provider} Did`,
      body: [`${provider} took the following steps:`, ...steps],
      quote: nextQuote(),
    });
  }

  const results = (cs.results ?? []).filter(
    (r) => isFilled(r.metric) && (isFilled(r.before) || isFilled(r.after))
  );
  if (isFilled(cs.headline_result) || results.length > 0) {
    const body: string[] = [];
    if (isFilled(cs.headline_result)) body.push(cs.headline_result);
    if (results.length > 0) {
      body.push(
        'The measurable change across the engagement is summarized below.'
      );
    }
    if (body.length > 0) {
      sections.push({ heading: 'The Results', body, quote: nextQuote() });
    }
  }

  if (isFilled(cs.transformation)) {
    sections.push({
      heading: 'The Transformation',
      body: [cs.transformation ?? ''],
      quote: nextQuote(),
    });
  }

  // Faithful restatement of the metric rows as outcome bullets. Use ASCII words
  // rather than an arrow glyph (→ is not in Helvetica's WinAnsi encoding).
  const key_outcomes = results.map((r) => {
    if (isFilled(r.before) && isFilled(r.after)) {
      return `${r.metric}: from ${r.before} to ${r.after}`;
    }
    return `${r.metric}: ${isFilled(r.after) ? r.after : r.before}`;
  });

  // No separate conclusion is derived — the "Transformation"/"Results" sections
  // already close the story, and we won't invent a closing paragraph.
  return { narrative_sections: sections, key_outcomes, conclusion: '' };
}
