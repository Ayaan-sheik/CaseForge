import { isFilled } from '@/lib/utils/isFilled';
import { normalizeCaseStudy } from '@/lib/utils/normalizeCaseStudy';
import { deriveLongFormContent } from '@/lib/utils/deriveLongFormContent';
import type {
  BeforeAfter,
  CaseStudy,
  ClientQuote,
  ContentSufficiency,
  NarrativeSection,
  StoryBlocks,
  ValidatedMetric,
} from '@/lib/types';

/** Optional Phase 3/5 artifacts the long-form renderer uses for depth + guards. */
export interface LongFormArtifacts {
  storyBlocks?: StoryBlocks | null;
  validatedMetrics?: ValidatedMetric[] | null;
  contentSufficiency?: ContentSufficiency | null;
  /** Provider/agency name fallback when not present on the case study. */
  providerName?: string;
}

export interface CaseStudyLongHtmlProps extends LongFormArtifacts {
  caseStudy: CaseStudy;
  clientName: string;
  serviceProvided?: string;
}

// ── small text utilities ────────────────────────────────────────────────────

/** Escape every value interpolated into the template — quotes/transcripts are user-supplied. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Normalise generated headings: split camel/pascal-stuck words, collapse whitespace. */
function cleanHeading(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

/** First sentence of a passage, truncated — used for hero subhead / before-after items. */
function firstSentence(text: string, maxLen: number): string {
  const t = text.trim();
  if (!t) return '';
  const match = t.match(/^.*?[.!?](\s|$)/);
  let s = (match ? match[0] : t).trim();
  if (s.length > maxLen) {
    s = s.slice(0, maxLen).replace(/[\s,;:]+\S*$/, '').trim() + '…';
  }
  return s;
}

function shorten(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).replace(/[\s,;:]+\S*$/, '').trim() + '…';
}

// ── closing / conclusion handling (single closing, no boilerplate) ───────────

/** A narrative heading that closes/recaps the story rather than advancing it. */
const CLOSING_HEADING_RE =
  /\b(conclusion|in closing|final thoughts?|the bottom line|takeaways?|strategic takeaway|closing|wrap[- ]?up|summary)\b/i;

function isClosingHeading(heading: string): boolean {
  return CLOSING_HEADING_RE.test(heading);
}

const GENERIC_OPENER_RE =
  /^(this case study|in conclusion|in summary|to summarize|this (?:demonstrates|shows|highlights|illustrates)|overall,? this|overall,|the engagement was a success|serves as a testament)/i;

/**
 * Clean a closing passage: strip a generic boilerplate opener when grounded
 * content follows, drop it entirely when the whole thing is hollow. Never
 * rewrites into invented framing.
 */
function refineClosing(text: string, clientName: string, providerName: string): string {
  if (!isFilled(text)) return '';
  const trimmed = text.trim();
  if (!GENERIC_OPENER_RE.test(trimmed)) return trimmed;
  const grounded =
    /[0-9$%]/.test(trimmed) ||
    (isFilled(clientName) && trimmed.includes(clientName)) ||
    (isFilled(providerName) && trimmed.includes(providerName));
  if (!grounded) return '';
  const rest = trimmed.replace(/^[^.!?]*[.!?]\s+/, '').trim();
  return rest.length > 0 ? rest : trimmed;
}

/** Higher = a stronger closing candidate (grounded + substantive). */
function closingScore(text: string): number {
  if (!isFilled(text)) return -1;
  let score = Math.min(text.length, 400) / 100;
  if (/[0-9$%]/.test(text)) score += 2;
  return score;
}

// ── quote attribution (never "Client, Client") ───────────────────────────────

/**
 * Build a clean attribution line. Uses name (+ title) when present, otherwise
 * the client name once. Never repeats identical values ("YourMom, YourMom").
 */
function attribution(quote: ClientQuote, clientName: string): string {
  const name = isFilled(quote.name) ? quote.name.trim() : '';
  const title = isFilled(quote.title) ? quote.title.trim() : '';
  if (name && title) {
    if (name.toLowerCase() === title.toLowerCase()) return name;
    return `${name}, ${title}`;
  }
  if (name) return name;
  return isFilled(clientName) ? clientName.trim() : '';
}

/** A pull-quote block (left accent rule). Returns '' when there's no quote. */
function pullQuote(quote: ClientQuote | undefined, clientName: string): string {
  if (!quote || !isFilled(quote.quote)) return '';
  const attr = attribution(quote, clientName);
  return `<blockquote class="pull-quote">&ldquo;${esc(quote.quote.trim())}&rdquo;${
    attr ? `<cite>— ${esc(attr)}</cite>` : ''
  }</blockquote>`;
}

const normQuote = (q: string): string => q.trim().toLowerCase();

// ── metric rows (validated metrics are the source of truth) ──────────────────

interface MetricRow {
  name: string;
  before: string;
  after: string;
  change: string;
  timeframe: string;
}

function metricStatusRank(m: ValidatedMetric): number {
  return m.status === 'client_confirmed' ? 0 : m.status === 'unverified' ? 2 : 1;
}

function hasResultsRows(rows: BeforeAfter[]): boolean {
  return rows.some((r) => isFilled(r.metric) && (isFilled(r.before) || isFilled(r.after)));
}

/**
 * Resolve the metric rows to display. Prefers code-validated metrics (which carry
 * trustworthy code-computed percentages); falls back to the case study's snapshot
 * or results rows when no validated metrics are available (e.g. re-render of an
 * old row). Never invents numbers.
 */
function resolveMetricRows(
  validated: ValidatedMetric[] | null | undefined,
  snapshot: BeforeAfter[],
  results: BeforeAfter[]
): MetricRow[] {
  const v = (validated ?? []).filter(
    (m) => isFilled(m.name) && (isFilled(m.before_value) || isFilled(m.after_value))
  );
  if (v.length > 0) {
    return [...v]
      .sort((a, b) => metricStatusRank(a) - metricStatusRank(b))
      .map((m) => ({
        name: m.name.trim(),
        before: isFilled(m.before_value) ? m.before_value!.trim() : '',
        after: isFilled(m.after_value) ? m.after_value!.trim() : '',
        change:
          m.percent_change !== undefined
            ? `${m.percent_change >= 0 ? '+' : ''}${m.percent_change}%`
            : '',
        timeframe: isFilled(m.timeframe) ? m.timeframe!.trim() : '',
      }));
  }
  const src = hasResultsRows(snapshot) ? snapshot : results;
  return src
    .filter((r) => isFilled(r.metric) && (isFilled(r.before) || isFilled(r.after)))
    .map((r) => ({
      name: r.metric.trim(),
      before: isFilled(r.before) ? r.before.trim() : '',
      after: isFilled(r.after) ? r.after.trim() : '',
      change: '',
      timeframe: '',
    }));
}

/** Up to three hero stat cards — the after value, with "from before" beneath. */
function metricCards(rows: MetricRow[]): string {
  const cards = rows.slice(0, 3).map((r) => {
    const big = r.after || r.before;
    const from = r.after && r.before ? `<span class="stat-from">from ${esc(r.before)}</span>` : '';
    const tf = r.timeframe ? `<span class="stat-tf">${esc(r.timeframe)}</span>` : '';
    return `<div class="stat"><span class="stat-label">${esc(r.name)}</span><span class="stat-value">${esc(
      big
    )}</span>${from}${tf}</div>`;
  });
  if (cards.length === 0) return '';
  return `<section class="stats">${cards.join('')}</section>`;
}

/** The "By the numbers" results table (a sanctioned proof card). */
function resultsTable(rows: MetricRow[]): string {
  if (rows.length === 0) return '';
  const showChange = rows.some((r) => r.change);
  const showTf = rows.some((r) => r.timeframe);
  const head =
    `<th>Metric</th><th>Before</th><th>After</th>` +
    (showChange ? '<th>Change</th>' : '') +
    (showTf ? '<th>Timeframe</th>' : '');
  const body = rows
    .map(
      (r) =>
        `<tr><td class="m-name">${esc(r.name)}</td><td>${esc(r.before || '—')}</td><td class="m-after">${esc(
          r.after || '—'
        )}</td>` +
        (showChange ? `<td class="m-change">${esc(r.change || '—')}</td>` : '') +
        (showTf ? `<td>${esc(r.timeframe || '—')}</td>` : '') +
        `</tr>`
    )
    .join('');
  return `<section class="proof">
    <div class="proof-label">By the numbers</div>
    <table class="results"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  </section>`;
}

// ── before → after comparison (proof card, qualitative-led) ──────────────────

function dedupeFilled(items: string[], cap: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    if (!isFilled(raw)) continue;
    const t = raw.trim();
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}

/**
 * Build a Before → After comparison from supported facts. Qualitative-led (pain
 * points / impact), supplemented with metric values only when needed to reach a
 * meaningful pair. Returns null unless there are ≥2 points on each side.
 */
function buildBeforeAfter(
  story: StoryBlocks | null | undefined,
  rows: MetricRow[],
  keyOutcomes: string[]
): { before: string[]; after: string[] } | null {
  const beforeQual = dedupeFilled(
    [
      ...(story?.pain_points ?? []),
      story?.before_state ? firstSentence(story.before_state, 130) : '',
    ],
    5
  );
  const afterQual = dedupeFilled(
    [
      ...keyOutcomes.map((o) => firstSentence(o, 130)),
      story?.operational_impact ? firstSentence(story.operational_impact, 130) : '',
      story?.business_impact ? firstSentence(story.business_impact, 130) : '',
      story?.workflow_change ? firstSentence(story.workflow_change, 130) : '',
    ],
    5
  );

  let before = beforeQual;
  let after = afterQual;

  // Supplement with metric before/after only if a side is short — keeps the
  // numeric repetition with the results table to a minimum.
  if (before.length < 2 || after.length < 2) {
    const metricBefore = rows.filter((r) => r.before).map((r) => `${r.name}: ${r.before}`);
    const metricAfter = rows.filter((r) => r.after).map((r) => `${r.name}: ${r.after}`);
    before = dedupeFilled([...beforeQual, ...metricBefore], 5);
    after = dedupeFilled([...afterQual, ...metricAfter], 5);
  }

  if (before.length < 2 || after.length < 2) return null;
  return { before, after };
}

function beforeAfterSection(ba: { before: string[]; after: string[] }): string {
  const col = (label: string, cls: string, items: string[]): string =>
    `<div class="ba-col ${cls}"><div class="ba-head">${label}</div><ul>${items
      .map((i) => `<li>${esc(i)}</li>`)
      .join('')}</ul></div>`;
  return `<section class="ba">
    <div class="proof-label">Before &rarr; After</div>
    <div class="ba-grid">${col('Before', 'ba-before', ba.before)}${col(
    'After',
    'ba-after',
    ba.after
  )}</div>
  </section>`;
}

// ── use-case chips (only when supported) ─────────────────────────────────────

const CHIP_RULES: { chip: string; re: RegExp }[] = [
  { chip: 'Audience growth', re: /follower|audience|reach|subscriber|grew|growth/i },
  { chip: 'Content consistency', re: /consistent|daily|calendar|cadence|regular post/i },
  { chip: 'Viewer retention', re: /retention|watch[- ]?time|view[- ]?through|rewatch/i },
  { chip: 'Revenue lift', re: /revenue|\bmrr\b|\bsales\b|\$|income/i },
  { chip: 'Team efficiency', re: /freed|efficien|operational|workflow|time back|handed off|no longer (?:has|needs)/i },
  { chip: 'Lead generation', re: /\blead(s)?\b/i },
  { chip: 'Conversion improvement', re: /conversion|convert|checkout|funnel|shopping page/i },
];

function deriveChips(corpus: string): string[] {
  if (!corpus.trim()) return [];
  return CHIP_RULES.filter((r) => r.re.test(corpus)).map((r) => r.chip).slice(0, 5);
}

// ── snapshot / at-a-glance rows ──────────────────────────────────────────────

function glanceRow(label: string, value: string): string {
  if (!isFilled(value)) return '';
  return `<div class="g-row"><span class="g-label">${esc(label)}</span><span class="g-value">${esc(
    value
  )}</span></div>`;
}

// ── editorial narrative section labels ───────────────────────────────────────

const SECTION_SEQUENCE = [
  'Starting point',
  'The problem',
  'The approach',
  'Operational shift',
  'Results',
];

function sectionLabel(heading: string, index: number): string {
  const h = heading.toLowerCase();
  if (/result|by the numbers|measurable|impact|growth|outcome/.test(h)) return 'Results';
  if (/operational|workflow|freed|efficiency|shift|team/.test(h)) return 'Operational shift';
  if (/implement|built|approach|system|did|solution|deliver|work/.test(h)) return 'The approach';
  if (/before|start|background|inconsistent|struggl|problem|challenge|need|trap|stuck/.test(h)) {
    return index === 0 ? 'Starting point' : 'The problem';
  }
  return SECTION_SEQUENCE[index] ?? 'The story';
}

/** One editorial narrative section — no card, just label + heading + prose + divider. */
function narrativeArticle(
  section: NarrativeSection,
  index: number,
  clientName: string,
  withDivider: boolean
): string {
  const paragraphs = (section.body ?? []).filter(isFilled);
  if (!isFilled(section.heading) && paragraphs.length === 0) return '';
  const label = sectionLabel(section.heading ?? '', index);
  const heading = isFilled(section.heading)
    ? `<h2>${esc(cleanHeading(section.heading))}</h2>`
    : '';
  const body = paragraphs.map((p) => `<p>${esc(p)}</p>`).join('');
  const quote = pullQuote(section.quote, clientName);
  const divider = withDivider ? '<hr class="rule" />' : '';
  return `<section class="article-section"><div class="sec-label">${esc(
    label
  )}</div>${heading}${body}${quote}${divider}</section>`;
}

// ── depth resolution ─────────────────────────────────────────────────────────

type Depth = 'long' | 'medium' | 'weak';
const MAX_SECTIONS: Record<Depth, number> = { long: 6, medium: 5, weak: 3 };

function resolveDepth(
  suff: ContentSufficiency | null | undefined,
  availableSections: number
): Depth {
  if (suff?.recommended_depth) {
    return suff.recommended_depth === 'long'
      ? 'long'
      : suff.recommended_depth === 'medium'
        ? 'medium'
        : 'weak';
  }
  if (suff?.overall) {
    return suff.overall === 'strong' ? 'long' : suff.overall === 'medium' ? 'medium' : 'weak';
  }
  if (availableSections >= 5) return 'long';
  if (availableSections >= 3) return 'medium';
  return 'weak';
}

// ── main builder ─────────────────────────────────────────────────────────────

/**
 * Build the long-form case-study HTML as a premium editorial article (HubSpot
 * style): a strong transformation hero, a compact at-a-glance card, scannable
 * stat cards, and an article-style narrative body where only proof elements
 * (stats, before/after, results table, quotes) get cards. Depth adapts to content
 * sufficiency; production guards keep [NEEDS INPUT], duplicate closings, and
 * broken attribution out of the customer-facing PDF. Invents nothing.
 */
export function buildCaseStudyLongHtml({
  caseStudy,
  clientName,
  serviceProvided,
  storyBlocks,
  validatedMetrics,
  contentSufficiency,
  providerName,
}: CaseStudyLongHtmlProps): string {
  const cs = normalizeCaseStudy(caseStudy);
  const story = storyBlocks ?? null;

  const provider = isFilled(providerName)
    ? providerName!.trim()
    : isFilled(cs.provider_name)
      ? cs.provider_name.trim()
      : '';

  // ── Guard 1: title never shows [NEEDS INPUT] ──
  const title = isFilled(cs.headline_result)
    ? cleanHeading(cs.headline_result)
    : provider
      ? `How ${clientName} Worked With ${provider}`
      : `${clientName} Case Study`;

  // ── Narrative: real sections, else faithful derived fallback ──
  const realSections = (cs.narrative_sections ?? []).filter(
    (sec) => isFilled(sec.heading) || (sec.body ?? []).some(isFilled)
  );
  const derived = deriveLongFormContent(cs);
  const usingDerived = realSections.length === 0;
  const allSections = usingDerived ? derived.narrative_sections : realSections;

  // ── Guard 2: split closing-like sections out of the body (single closing) ──
  const bodySectionsRaw = allSections.filter((s) => !isClosingHeading(s.heading ?? ''));
  const closingSections = allSections.filter((s) => isClosingHeading(s.heading ?? ''));

  const realKeyOutcomes = (cs.key_outcomes ?? []).filter(isFilled);
  const keyOutcomes = realKeyOutcomes.length > 0 ? realKeyOutcomes : derived.key_outcomes;

  // ── Adaptive depth ──
  const depth = resolveDepth(contentSufficiency, bodySectionsRaw.length);
  const bodySections = bodySectionsRaw.slice(0, MAX_SECTIONS[depth]);

  // ── Metrics (validated metrics are the source of truth) ──
  const metricRows = resolveMetricRows(validatedMetrics, cs.snapshot, cs.results);
  const showResultsTable = depth !== 'weak' && metricRows.length > 0;

  // ── Before → After (omitted when not supported) ──
  const ba = depth === 'weak' ? null : buildBeforeAfter(story, metricRows, keyOutcomes);

  // ── Closing: pick the single strongest candidate ──
  const closingCandidates = [
    refineClosing(cs.conclusion ?? '', clientName, provider),
    refineClosing(story?.strategic_takeaway ?? '', clientName, provider),
    refineClosing(
      closingSections
        .flatMap((s) => (s.body ?? []).filter(isFilled))
        .join(' '),
      clientName,
      provider
    ),
    refineClosing(usingDerived ? derived.conclusion : '', clientName, provider),
  ];
  const closing = closingCandidates.reduce(
    (best, cur) => (closingScore(cur) > closingScore(best) ? cur : best),
    ''
  );

  // ── Metadata for hero + at-a-glance ──
  const industryRaw = (cs.industry_size.split('·')[0] ?? '').trim();
  const industryDisplay = shorten(industryRaw, 40);
  const teamSize = isFilled(cs.team_size) ? cs.team_size!.trim() : '';
  const service = serviceProvided ?? '';
  const longService = isFilled(service) && service.length > 60;

  // ── Use-case chips from a supported corpus ──
  const corpus = [
    cs.headline_result,
    cs.challenge,
    cs.transformation ?? '',
    ...(cs.what_we_did ?? []),
    ...keyOutcomes,
    ...metricRows.map((r) => r.name),
    ...bodySections.flatMap((s) => [s.heading, ...(s.body ?? [])]),
    story?.before_state ?? '',
    story?.operational_impact ?? '',
    story?.business_impact ?? '',
    ...(story?.pain_points ?? []),
    ...(story?.key_outcomes ?? []),
  ]
    .filter(Boolean)
    .join(' \n ');
  const chips = deriveChips(corpus);

  // ── Hero eyebrow + subheadline ──
  const eyebrow =
    [industryDisplay, teamSize, chips[0]].filter(Boolean).join(' · ') || 'Client success story';
  const subRaw = isFilled(cs.transformation)
    ? cs.transformation!
    : story?.business_impact ?? '';
  const subheadline = firstSentence(subRaw, 190);

  // ── At-a-glance card ──
  const glanceHtml = [
    glanceRow('Client', clientName),
    glanceRow('Industry', industryDisplay),
    glanceRow('Team size', teamSize),
    glanceRow('Location', isFilled(cs.location) ? cs.location!.trim() : ''),
    glanceRow('Timeline', isFilled(cs.timeline) ? cs.timeline.trim() : ''),
    longService ? '' : glanceRow('Service', service),
  ].join('');
  const chipsHtml =
    chips.length > 0
      ? `<div class="chips">${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>`
      : '';
  const glanceCard = glanceHtml
    ? `<aside class="glance"><div class="glance-title">At a glance</div>${glanceHtml}</aside>`
    : '';

  // ── "The work" summary (light block, not a heavy card) ──
  const steps = (cs.what_we_did ?? []).filter(isFilled).slice(0, 6);
  const implComponents = (story?.implementation_components ?? []).filter(isFilled);
  const workItems = steps.length > 0 ? steps : implComponents;
  const workIntro = longService
    ? `<p class="work-intro">${esc(service)}</p>`
    : isFilled(story?.implementation_summary)
      ? `<p class="work-intro">${esc(story!.implementation_summary!.trim())}</p>`
      : '';
  const workHtml =
    workItems.length > 0 || workIntro
      ? `<section class="work"><div class="sec-label">The work</div>${workIntro}${
          workItems.length > 0
            ? `<ul class="work-list">${workItems.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>`
            : ''
        }</section>`
      : '';

  // ── Key outcomes (compact list, not big cards) ──
  const outcomesHtml =
    keyOutcomes.length > 0
      ? `<section class="outcomes"><div class="sec-label">Key outcomes</div><ul class="outcome-list">${keyOutcomes
          .slice(0, 6)
          .map((o) => `<li>${esc(o)}</li>`)
          .join('')}</ul></section>`
      : '';

  // ── Lead pull-quote: one strong quote not already used inside a section ──
  const usedQuoteKeys = new Set(
    bodySections
      .map((s) => s.quote?.quote)
      .filter((q): q is string => Boolean(q && isFilled(q)))
      .map(normQuote)
  );
  const leadQuote = usingDerived
    ? undefined
    : (cs.quotes ?? []).find((q) => isFilled(q.quote) && !usedQuoteKeys.has(normQuote(q.quote)));
  const leadQuoteHtml = leadQuote ? pullQuote(leadQuote, clientName) : '';

  // ── Narrative article body (editorial sections, dividers between) ──
  const articleHtml = bodySections
    .map((sec, i) =>
      narrativeArticle(sec, i, clientName, i < bodySections.length - 1)
    )
    .join('');

  // ── Closing (single) ──
  const closingHtml = isFilled(closing)
    ? `<section class="closing"><div class="sec-label">In closing</div><p>${esc(closing)}</p></section>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${esc(title)}</title>
<style>${STYLES}</style>
</head>
<body>
<main class="page-shell">
  <header class="hero">
    <div class="hero-main">
      <div class="eyebrow">${esc(eyebrow)}</div>
      <h1>${esc(title)}</h1>
      ${isFilled(subheadline) ? `<p class="hero-sub">${esc(subheadline)}</p>` : ''}
      ${chipsHtml}
    </div>
    ${glanceCard}
  </header>

  ${metricCards(metricRows)}

  <div class="content">
    ${workHtml}
    ${leadQuoteHtml}
    ${articleHtml}
    ${ba ? beforeAfterSection(ba) : ''}
    ${showResultsTable ? resultsTable(metricRows) : ''}
    ${outcomesHtml}
    ${closingHtml}
  </div>
</main>
</body>
</html>`;
}

/**
 * Editorial print-first visual system. System font stack (no network font
 * dependency — rendering never blocks on a web font). Article-led: narrative
 * sections are plain typographic blocks with a small accent label, a heading, and
 * readable prose; only proof elements (stat cards, at-a-glance, pull quotes,
 * before/after, results table) are carded. `@page { size:A4 }` only — page margins
 * are owned by Puppeteer's pdf() margins so the running header/footer get space.
 */
const STYLES = `
@page{size:A4;}
:root{
  --bg:#f6f1ea;--paper:#fffdf9;--ink:#211b17;--body:#3a322c;--muted:#7a6d62;
  --accent:#9f2d25;--accent-dark:#6f1d17;--line:#e7ddd0;--soft:#f3e9db;--card:#fffaf3;
}
*{box-sizing:border-box;}
body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:var(--paper);color:var(--ink);line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.page-shell{width:100%;max-width:none;padding:14px 44px 28px;background:var(--paper);}

/* ── Hero ── */
.hero{display:grid;grid-template-columns:minmax(0,1fr) 248px;gap:34px;align-items:start;padding:8px 0 22px;border-bottom:1px solid var(--line);margin-bottom:26px;}
.hero-main{min-width:0;}
.eyebrow{color:var(--accent);font-size:.72rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase;margin-bottom:14px;}
h1{margin:0;font-size:33px;line-height:1.08;letter-spacing:-.025em;font-weight:820;color:var(--ink);}
.hero-sub{margin:15px 0 0;color:var(--muted);font-size:1.04rem;line-height:1.5;max-width:96%;}
.chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px;}
.chip{display:inline-block;padding:4px 11px;border-radius:999px;background:var(--soft);color:var(--accent-dark);font-size:.72rem;font-weight:700;letter-spacing:.01em;}

/* ── At a glance card ── */
.glance{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;break-inside:avoid;page-break-inside:avoid;}
.glance-title{color:var(--muted);font-size:.68rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;}
.g-row{display:flex;justify-content:space-between;gap:14px;padding:6px 0;border-bottom:1px solid var(--line);font-size:.84rem;}
.g-row:last-child{border-bottom:none;}
.g-label{color:var(--muted);font-weight:650;}
.g-value{font-weight:720;text-align:right;color:var(--ink);}

/* ── Stat cards ── */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:28px;break-inside:avoid;page-break-inside:avoid;}
.stat{background:var(--soft);border:1px solid #ecddc8;border-radius:14px;padding:16px 18px;display:flex;flex-direction:column;gap:3px;break-inside:avoid;page-break-inside:avoid;}
.stat-label{color:var(--muted);font-size:.7rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;}
.stat-value{font-size:2rem;line-height:1.05;font-weight:880;letter-spacing:-.04em;color:var(--ink);margin-top:2px;}
.stat-from{color:var(--muted);font-weight:650;font-size:.82rem;}
.stat-tf{color:var(--muted);font-weight:600;font-size:.74rem;}

/* ── Content / editorial body ── */
.content{padding:0;}
.sec-label{color:var(--accent);font-size:.7rem;font-weight:850;letter-spacing:.11em;text-transform:uppercase;margin-bottom:8px;}
.article-section{margin:0 0 4px;max-width:660px;}
.article-section h2{margin:0 0 12px;font-size:1.42rem;line-height:1.18;letter-spacing:-.02em;font-weight:780;color:var(--ink);break-after:avoid;page-break-after:avoid;}
.article-section p{margin:0 0 13px;font-size:14.6px;line-height:1.62;color:var(--body);}
.article-section p:last-of-type{margin-bottom:0;}
.rule{border:none;border-top:1px solid var(--line);margin:22px 0;}

/* ── The work + outcomes (light, not heavy cards) ── */
.work,.outcomes{margin:0 0 24px;max-width:660px;}
.work-intro{margin:0 0 12px;font-size:14.6px;line-height:1.62;color:var(--body);}
.work-list,.outcome-list{margin:0;padding-left:1.15rem;}
.work-list li,.outcome-list li{margin:6px 0;font-size:14.4px;line-height:1.55;color:var(--body);}

/* ── Pull quote ── */
.pull-quote{margin:22px 0;padding:4px 0 4px 20px;border-left:3px solid var(--accent);font-size:1.16rem;line-height:1.45;font-weight:560;color:#3a2c25;font-style:italic;max-width:640px;break-inside:avoid;page-break-inside:avoid;}
.pull-quote cite{display:block;margin-top:10px;font-size:.84rem;font-style:normal;font-weight:700;color:var(--muted);}

/* ── Before → After ── */
.proof-label{color:var(--accent);font-size:.7rem;font-weight:850;letter-spacing:.11em;text-transform:uppercase;margin-bottom:12px;}
.ba{margin:8px 0 26px;break-inside:avoid;page-break-inside:avoid;}
.ba-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.ba-col{border:1px solid var(--line);border-radius:14px;padding:16px 18px;background:var(--card);}
.ba-before{background:#fbf4ee;}
.ba-after{background:#f3f6ef;border-color:#dde7d4;}
.ba-head{font-size:.74rem;font-weight:850;letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px;color:var(--muted);}
.ba-after .ba-head{color:#3f6b35;}
.ba-col ul{margin:0;padding-left:1.05rem;}
.ba-col li{margin:6px 0;font-size:.9rem;line-height:1.5;color:var(--body);}

/* ── Results table ── */
.proof{margin:8px 0 26px;break-inside:avoid;page-break-inside:avoid;}
table.results{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden;break-inside:avoid;page-break-inside:avoid;}
table.results th,table.results td{padding:11px 14px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;font-size:.88rem;}
table.results th{background:var(--soft);color:#4a382f;font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;}
table.results tr:last-child td{border-bottom:none;}
table.results .m-name{font-weight:700;color:var(--ink);}
table.results .m-after{font-weight:760;}
table.results .m-change{font-weight:780;color:var(--accent-dark);}

/* ── Closing ── */
.closing{margin:6px 0 0;padding:18px 20px;background:var(--soft);border-radius:14px;border-left:3px solid var(--accent);max-width:680px;break-inside:avoid;page-break-inside:avoid;}
.closing p{margin:0;font-size:15px;line-height:1.6;color:#3a2c25;font-weight:560;}
`;
