import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCaseStudyBySlug } from '@/lib/supabase/getCaseStudyBySlug';
import { isFilled } from '@/lib/utils/isFilled';
import type { NarrativeSection, ClientQuote, ValidatedMetric, BeforeAfter } from '@/lib/types';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getCaseStudyBySlug(params.slug);
  if (!data) return { title: 'Case Study — CaseForge' };
  const { cs, campaign } = data;
  const title = `${campaign.client_name} — Full Case Study`;
  const description = isFilled(cs.headline_result) ? cs.headline_result : undefined;
  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
  };
}

// ── helpers ─────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

function filled(v: string | undefined | null): v is string {
  return isFilled(v ?? '');
}

function PullQuote({ quote }: { quote: ClientQuote }) {
  return (
    <figure className="my-8 border-l-[3px] border-accent pl-6">
      <blockquote className="font-editorial text-[clamp(18px,2.2vw,22px)] font-medium italic leading-[1.5] text-ink">
        &ldquo;{quote.quote}&rdquo;
      </blockquote>
      {(filled(quote.name) || filled(quote.title)) && (
        <figcaption className="mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-secondary">
          — {filled(quote.name) ? quote.name : ''}
          {filled(quote.title) && `, ${quote.title}`}
        </figcaption>
      )}
    </figure>
  );
}

// ── fallback narrative when narrative_sections is empty ──────────────────────

interface FallbackSection {
  heading: string;
  body: string[];
  quote?: ClientQuote;
  list?: string[];
}

function buildFallbackSections(
  cs: {
    challenge: string;
    why_chose: string;
    provider_name: string;
    what_we_did: string[];
    transformation?: string;
  },
  quotes: ClientQuote[]
): FallbackSection[] {
  const sections: FallbackSection[] = [];
  let qi = 0;

  if (filled(cs.challenge)) {
    sections.push({
      heading: 'The Challenge',
      body: [cs.challenge],
      quote: quotes[qi++],
    });
  }
  if (filled(cs.why_chose)) {
    sections.push({
      heading: `Why They Chose ${filled(cs.provider_name) ? cs.provider_name : 'Us'}`,
      body: [cs.why_chose],
    });
  }
  const steps = (cs.what_we_did ?? []).filter(filled);
  if (steps.length > 0) {
    sections.push({
      heading: 'The Approach',
      body: [],
      list: steps,
      quote: quotes[qi++],
    });
  }
  if (filled(cs.transformation)) {
    sections.push({
      heading: 'The Transformation',
      body: [cs.transformation!],
      quote: quotes[qi++],
    });
  }
  return sections;
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function CaseStudyReadPage({ params }: { params: { slug: string } }) {
  const data = await getCaseStudyBySlug(params.slug);
  if (!data) notFound();

  const { cs, campaign, validatedMetrics, slug } = data;
  const clientName = campaign.client_name;

  const snapshot = (cs.snapshot ?? []).filter(
    (s) => isFilled(s.metric) && isFilled(s.after)
  );
  const quotes = (cs.quotes ?? []).filter((q) => isFilled(q.quote));
  const keyOutcomes = (cs.key_outcomes ?? []).filter(filled);
  const narrativeSections: NarrativeSection[] = (cs.narrative_sections ?? []).filter(
    (s) => filled(s.heading) && s.body?.some(filled)
  );

  // Results: prefer validated metrics for a richer table, else fall back to cs.results
  const hasValidated =
    Array.isArray(validatedMetrics) && validatedMetrics.length > 0;

  const resultsRows: Array<BeforeAfter & { change?: string; timeframe?: string }> = hasValidated
    ? (validatedMetrics as ValidatedMetric[])
        .filter((m) => isFilled(m.name) && (isFilled(m.before_value ?? '') || isFilled(m.after_value ?? '')))
        .map((m) => ({
          metric: m.name,
          before: m.before_value ?? '',
          after: m.after_value ?? '',
          change:
            m.percent_change !== undefined
              ? `${m.percent_change > 0 ? '+' : ''}${m.percent_change.toFixed(1)}%`
              : undefined,
          timeframe: m.timeframe,
        }))
    : (cs.results ?? [])
        .filter((r) => isFilled(r.metric) && (isFilled(r.before) || isFilled(r.after)))
        .map((r) => ({ ...r }));

  const showResultsTable = resultsRows.length > 0;
  const showChangeCol = hasValidated && resultsRows.some((r) => 'change' in r && r.change);
  const showTimeframeCol = hasValidated && resultsRows.some((r) => 'timeframe' in r && filled(r.timeframe));

  // Conclusion: prefer cs.conclusion, fallback to cs.transformation
  const conclusion = filled(cs.conclusion) ? cs.conclusion : filled(cs.transformation) ? cs.transformation : null;

  // Glance card fields
  const glanceFields: { label: string; value: string }[] = [
    { label: 'Client', value: clientName },
    { label: 'Industry', value: cs.industry_size },
    { label: 'Size', value: cs.team_size ?? '' },
    { label: 'Location', value: cs.location ?? '' },
    { label: 'Timeline', value: cs.timeline },
    { label: 'Service', value: campaign.service_provided },
  ].filter((f) => filled(f.value));

  // Use narrative_sections if present, else build fallback
  const usedQuoteIndices = new Set<number>();
  const fallbackSections =
    narrativeSections.length === 0
      ? buildFallbackSections(
          {
            challenge: cs.challenge,
            why_chose: cs.why_chose,
            provider_name: cs.provider_name,
            what_we_did: cs.what_we_did,
            transformation: cs.transformation,
          },
          quotes
        )
      : [];

  // Track which quotes appear inline (to avoid repeating them in the testimonials section)
  if (narrativeSections.length > 0) {
    narrativeSections.forEach((s) => {
      if (s.quote && isFilled(s.quote.quote)) {
        const idx = quotes.findIndex((q) => q.quote === s.quote!.quote);
        if (idx !== -1) usedQuoteIndices.add(idx);
      }
    });
  } else {
    fallbackSections.forEach((s) => {
      if (s.quote) {
        const idx = quotes.findIndex((q) => q.quote === s.quote!.quote);
        if (idx !== -1) usedQuoteIndices.add(idx);
      }
    });
  }

  const remainingQuotes = quotes.filter((_, i) => !usedQuoteIndices.has(i));

  return (
    <div className="min-h-screen bg-paper">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/88 backdrop-blur-[10px]">
        <div className="mx-auto flex h-[68px] max-w-2xl items-center justify-between px-7">
          <Link
            href="/"
            className="flex items-center gap-[9px] font-display text-[19px] font-semibold tracking-[-0.02em] text-ink no-underline"
          >
            <span className="h-[10px] w-[10px] flex-shrink-0 rounded-full bg-accent" />
            CaseForge
          </Link>
          <Link
            href={`/case-study/${slug}`}
            className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-secondary hover:text-ink"
          >
            ← Overview
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-7 pb-24 pt-14">

        {/* Hero */}
        <div className="animate-scale-in flex h-14 w-14 items-center justify-center rounded-[14px] bg-ink font-display text-lg font-semibold text-paper">
          {initials(clientName)}
        </div>

        <p className="animate-fade-up eyebrow mt-6" style={{ animationDelay: '60ms' }}>
          Case study · {campaign.service_provided}
        </p>

        <h1
          className="animate-fade-up mt-4 font-display text-[clamp(28px,4vw,42px)] font-semibold leading-tight tracking-[-0.03em] text-ink"
          style={{ animationDelay: '120ms' }}
        >
          {filled(cs.headline_result) ? cs.headline_result : clientName}
        </h1>

        {filled(cs.industry_size) && (
          <p
            className="animate-fade-up mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted"
            style={{ animationDelay: '160ms' }}
          >
            {cs.industry_size}
            {filled(cs.location) && ` · ${cs.location}`}
            {filled(cs.timeline) && ` · ${cs.timeline}`}
          </p>
        )}

        {/* At-a-glance card */}
        {glanceFields.length > 0 && (
          <div
            className="animate-fade-up mt-10 rounded-[18px] border border-line bg-subtle p-6"
            style={{ animationDelay: '200ms' }}
          >
            <p className="eyebrow mb-4">At a glance</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {glanceFields.map((f) => (
                <div key={f.label}>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                    {f.label}
                  </dt>
                  <dd className="mt-1 text-[14px] font-medium text-ink">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Stats */}
        {snapshot.length > 0 && (
          <section
            className="animate-fade-up mt-14"
            style={{ animationDelay: '240ms' }}
          >
            <h2 className="eyebrow">By the numbers</h2>
            <div className="mt-5 grid gap-px overflow-hidden rounded-[18px] border border-line bg-line sm:grid-cols-3">
              {snapshot.map((s, i) => (
                <div key={i} className="bg-white px-5 py-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                    {s.metric}
                  </p>
                  <p className="mt-2 font-display text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink">
                    {s.after}
                  </p>
                  {filled(s.before) && (
                    <p className="mt-1.5 font-mono text-[10px] text-ink-secondary">
                      from {s.before}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Narrative body — long-form sections */}
        {narrativeSections.length > 0 ? (
          <div className="mt-14 space-y-12">
            {narrativeSections.map((section, i) => (
              <section key={i} className="animate-fade-up" style={{ animationDelay: `${260 + i * 40}ms` }}>
                <h2 className="font-display text-[22px] font-semibold leading-snug tracking-[-0.02em] text-ink">
                  {section.heading}
                </h2>
                <div className="mt-4 space-y-4">
                  {(section.body ?? []).filter(filled).map((para, j) => (
                    <p key={j} className="max-w-[65ch] text-[16px] leading-[1.75] text-ink-secondary">
                      {para}
                    </p>
                  ))}
                </div>
                {section.quote && isFilled(section.quote.quote) && (
                  <PullQuote quote={section.quote} />
                )}
              </section>
            ))}
          </div>
        ) : (
          // Fallback: render challenge / why_chose / approach / transformation
          <div className="mt-14 space-y-12">
            {fallbackSections.map((section, i) => (
              <section key={i} className="animate-fade-up" style={{ animationDelay: `${260 + i * 40}ms` }}>
                <h2 className="font-display text-[22px] font-semibold leading-snug tracking-[-0.02em] text-ink">
                  {section.heading}
                </h2>
                {section.body.filter(filled).map((para, j) => (
                  <p key={j} className="mt-4 max-w-[65ch] text-[16px] leading-[1.75] text-ink-secondary">
                    {para}
                  </p>
                ))}
                {section.list && section.list.length > 0 && (
                  <ol className="mt-4 max-w-[65ch] list-decimal space-y-2 pl-5 text-[16px] leading-[1.75] text-ink-secondary marker:font-mono marker:text-ink-muted">
                    {section.list.map((step, j) => (
                      <li key={j}>{step}</li>
                    ))}
                  </ol>
                )}
                {section.quote && isFilled(section.quote.quote) && (
                  <PullQuote quote={section.quote} />
                )}
              </section>
            ))}
          </div>
        )}

        {/* Results table */}
        {showResultsTable && (
          <section className="animate-fade-up mt-14">
            <h2 className="eyebrow">The results</h2>
            <div className="mt-5 overflow-hidden rounded-[18px] border border-line bg-white">
              <table className="w-full text-left text-[15px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                      Metric
                    </th>
                    <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                      Before
                    </th>
                    <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                      After
                    </th>
                    {showChangeCol && (
                      <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                        Change
                      </th>
                    )}
                    {showTimeframeCol && (
                      <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                        Period
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {resultsRows.map((r, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      <td className="px-5 py-3 text-ink">{r.metric}</td>
                      <td className="px-5 py-3 text-ink-secondary">{r.before}</td>
                      <td className="px-5 py-3 font-semibold text-ink">{r.after}</td>
                      {showChangeCol && (
                        <td className="px-5 py-3 font-mono text-[13px] text-accent">
                          {'change' in r ? (r.change ?? '—') : '—'}
                        </td>
                      )}
                      {showTimeframeCol && (
                        <td className="px-5 py-3 text-[13px] text-ink-muted">
                          {'timeframe' in r ? (r.timeframe ?? '') : ''}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Key outcomes */}
        {keyOutcomes.length > 0 && (
          <section className="animate-fade-up mt-14">
            <h2 className="eyebrow">Key outcomes</h2>
            <ul className="mt-5 space-y-3">
              {keyOutcomes.map((outcome, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-[6px] h-[6px] w-[6px] flex-shrink-0 rounded-full bg-accent" />
                  <span className="text-[15px] leading-[1.7] text-ink-secondary">{outcome}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Remaining testimonials (quotes not already used inline) */}
        {remainingQuotes.length > 0 && (
          <section className="animate-fade-up mt-16 border-t border-line pt-14">
            <h2 className="eyebrow mb-10">In their words</h2>
            <div className="space-y-12">
              {remainingQuotes.map((q, i) => (
                <figure key={i} className="text-center">
                  <blockquote className="mx-auto max-w-[24em] font-editorial text-[clamp(20px,2.6vw,26px)] font-medium italic leading-[1.45] tracking-[-0.01em] text-ink">
                    &ldquo;{q.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-secondary">
                    — {filled(q.name) ? q.name : clientName}
                    {filled(q.title) && `, ${q.title}`}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* Conclusion */}
        {conclusion && (
          <section className="animate-fade-up mt-14 border-t border-line pt-10">
            <p className="max-w-[65ch] text-[17px] leading-[1.8] text-ink-secondary">
              {conclusion}
            </p>
          </section>
        )}

        {/* CTA */}
        {filled(cs.cta) && (
          <section className="animate-fade-up mt-14 text-center">
            <p className="mx-auto max-w-[38ch] font-display text-[22px] font-semibold leading-snug tracking-[-0.02em] text-ink">
              {cs.cta}
            </p>
          </section>
        )}
      </article>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-7 py-6">
          <Link
            href="/"
            className="flex items-center gap-[9px] font-display text-[15px] font-semibold tracking-[-0.02em] text-ink no-underline"
          >
            <span className="h-[8px] w-[8px] flex-shrink-0 rounded-full bg-accent" />
            CaseForge
          </Link>
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
            Made with CaseForge
          </p>
        </div>
      </footer>
    </div>
  );
}
