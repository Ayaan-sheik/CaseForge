import { isFilled } from '@/lib/utils/isFilled';
import { normalizeCaseStudy } from '@/lib/utils/normalizeCaseStudy';
import { deriveLongFormContent } from '@/lib/utils/deriveLongFormContent';
import type {
  BeforeAfter,
  CaseStudy,
  ClientQuote,
  NarrativeSection,
} from '@/lib/types';

export interface CaseStudyLongHtmlProps {
  caseStudy: CaseStudy;
  clientName: string;
  serviceProvided?: string;
}

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

/** First sentence of a passage, truncated — used to derive a hero subheadline. */
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

/**
 * Decide how to render the conclusion. We never rewrite it (that would invent
 * framing), but we avoid showing a hollow essay ending: suppress it only when it
 * is *mostly generic* — opens with a boilerplate phrase AND carries no concrete
 * grounded detail (a number, the client, or the provider). When grounded content
 * follows a generic opener, strip just the opener; otherwise render as-is.
 */
function refineConclusion(conclusion: string, clientName: string, providerName: string): string {
  if (!isFilled(conclusion)) return '';
  const text = conclusion.trim();
  const generic = /^(this case study|in conclusion|in summary|to summarize|this (?:demonstrates|shows|highlights|illustrates)|overall,? this)/i.test(text);
  if (!generic) return text;
  const grounded =
    /[0-9$%]/.test(text) ||
    (isFilled(clientName) && text.includes(clientName)) ||
    (isFilled(providerName) && text.includes(providerName));
  if (!grounded) return '';
  // Grounded content after a generic opener — drop the opening sentence if there's
  // substance left, otherwise keep the whole thing rather than hide useful detail.
  const rest = text.replace(/^[^.!?]*[.!?]\s+/, '').trim();
  return rest.length > 0 ? rest : text;
}

/** One key-outcome card; "Label: sentence" splits into a bold label + sentence. */
function outcomeCard(outcome: string): string {
  const idx = outcome.indexOf(':');
  if (idx > 0 && idx < outcome.length - 1) {
    const label = outcome.slice(0, idx).trim();
    const sentence = outcome.slice(idx + 1).trim();
    return `<div class="outcome-card"><b>${esc(label)}</b><span>${esc(sentence)}</span></div>`;
  }
  return `<div class="outcome-card"><span>${esc(outcome)}</span></div>`;
}

function isResultsHeading(heading: string): boolean {
  return /result/i.test(heading);
}

function hasResultsRows(results: BeforeAfter[]): boolean {
  return results.some(
    (r) => isFilled(r.metric) && (isFilled(r.before) || isFilled(r.after))
  );
}

/** A snapshot row in the hero aside — omitted when the value is empty. */
function snapshotRow(label: string, value: string): string {
  if (!isFilled(value)) return '';
  return `<div class="snap-row"><span class="snap-label">${esc(label)}</span><span class="snap-value">${esc(value)}</span></div>`;
}

/** Accent quote card with attribution. Returns '' when there's no quote. */
function quoteCard(quote: ClientQuote | undefined, clientName: string): string {
  if (!quote || !isFilled(quote.quote)) return '';
  const attribution = [
    isFilled(quote.name) ? quote.name : clientName,
    isFilled(quote.title) ? quote.title : null,
    clientName,
  ]
    .filter((v): v is string => Boolean(v))
    .join(', ');
  return `<div class="quote-card">&ldquo;${esc(quote.quote)}&rdquo;<small>${esc(attribution)}</small></div>`;
}

/** Up to three metric cards. Prefers the snapshot rows, falls back to results. */
function metricsRow(snapshot: BeforeAfter[], results: BeforeAfter[]): string {
  const source = hasResultsRows(snapshot) ? snapshot : results;
  const cards = source
    .filter((r) => isFilled(r.metric) && (isFilled(r.before) || isFilled(r.after)))
    .slice(0, 3)
    .map((r) => {
      const big = isFilled(r.after) ? r.after : r.before;
      const from =
        isFilled(r.after) && isFilled(r.before)
          ? `<div class="metric-from">from ${esc(r.before)}</div>`
          : '';
      return `<div class="metric"><span class="metric-label">${esc(r.metric)}</span><span class="metric-value">${esc(big)}</span>${from}</div>`;
    });
  if (cards.length === 0) return '';
  return `<section class="metrics-row">${cards.join('')}</section>`;
}

/** The Metric | Before | After table, wrapped in a section card. */
function resultsTableSection(results: BeforeAfter[], kicker: string, heading: string): string {
  const rows = results.filter(
    (r) => isFilled(r.metric) && (isFilled(r.before) || isFilled(r.after))
  );
  if (rows.length === 0) return '';
  const body = rows
    .map(
      (r) =>
        `<tr><td>${esc(r.metric)}</td><td>${esc(r.before)}</td><td>${esc(r.after)}</td></tr>`
    )
    .join('');
  return `<section class="section"><div class="section-header"><div><div class="section-kicker">${esc(kicker)}</div><h2>${esc(heading)}</h2></div></div><div class="section-body"><table><thead><tr><th>Metric</th><th>Before</th><th>After</th></tr></thead><tbody>${body}</tbody></table></div></section>`;
}

/** One narrative section as a card: kicker + heading + paragraphs + optional quote. */
function narrativeSection(
  section: NarrativeSection,
  kicker: string,
  clientName: string
): string {
  const paragraphs = (section.body ?? []).filter(isFilled);
  if (!isFilled(section.heading) && paragraphs.length === 0) return '';
  const heading = isFilled(section.heading)
    ? `<h2>${esc(cleanHeading(section.heading))}</h2>`
    : '';
  const body = paragraphs.map((p) => `<p>${esc(p)}</p>`).join('');
  const quote = quoteCard(section.quote, clientName);
  return `<section class="section"><div class="section-header"><div><div class="section-kicker">${esc(kicker)}</div>${heading}</div></div><div class="section-body">${body}${quote}</div></section>`;
}

const PAD = (n: number): string => String(n + 1).padStart(2, '0');

/**
 * Build the long-form case-study HTML — the visual system of
 * `templates/casestudy.html` (cream paper, hero, metric cards, dynamically-named
 * section cards, accent quote cards, dark footer) populated with real case-study
 * data. Reuses the exact content decisions of `CaseStudyLongPDF` (normalize →
 * derive fallback → isFilled → results-anchor injection) so nothing is invented
 * and no empty cards/rows are rendered.
 */
export function buildCaseStudyLongHtml({
  caseStudy,
  clientName,
  serviceProvided,
}: CaseStudyLongHtmlProps): string {
  const cs = normalizeCaseStudy(caseStudy);

  const title = isFilled(cs.headline_result)
    ? cs.headline_result
    : `${clientName} — case study`;

  const realSections = (cs.narrative_sections ?? []).filter(
    (sec) => isFilled(sec.heading) || (sec.body ?? []).some(isFilled)
  );
  const realKeyOutcomes = (cs.key_outcomes ?? []).filter(isFilled);

  // Fall back to a faithful narrative derived from the structured fields when the
  // LLM produced no narrative (old rows / under-produced output). Invents nothing.
  const derived = deriveLongFormContent(cs);
  const usingDerived = realSections.length === 0;
  const sections = usingDerived ? derived.narrative_sections : realSections;
  const keyOutcomes = realKeyOutcomes.length > 0 ? realKeyOutcomes : derived.key_outcomes;
  const conclusion = refineConclusion(
    (isFilled(cs.conclusion) ? cs.conclusion : derived.conclusion) ?? '',
    clientName,
    cs.provider_name
  );

  // Featured quote sits in the hero on the rich path only; on the derived path
  // quotes are distributed inside the sections, so showing one here would dupe it.
  const lead = usingDerived
    ? undefined
    : (cs.quotes ?? []).find((q) => isFilled(q.quote));

  const showResultsTable = hasResultsRows(cs.results);
  const resultsAnchor = sections.findIndex((sec) => isResultsHeading(sec.heading));

  // Show industry only (not the combined "industry · size") in the sidebar/eyebrow;
  // team size has its own row. Truncate long industry text for display.
  const industryRaw = (cs.industry_size.split('·')[0] ?? '').trim();
  const industryDisplay =
    industryRaw.length > 40 ? industryRaw.slice(0, 40).trim() + '…' : industryRaw;

  // Hero subheadline: the before→after arc, surfaced from the existing transformation
  // field (rich path only — on the derived path it already becomes a section).
  const subheadline = usingDerived ? '' : firstSentence(cs.transformation ?? '', 180);

  // ── Hero aside: short client-snapshot fields only ──
  const service = serviceProvided ?? '';
  // Long service descriptions don't belong in the narrow sidebar — they move to
  // their own "What was implemented" section below the hero.
  const longService = isFilled(service) && service.length > 120;
  const snapshotHtml = [
    snapshotRow('Client', clientName),
    snapshotRow('Industry', industryDisplay),
    snapshotRow('Team size', cs.team_size ?? ''),
    snapshotRow('Location', cs.location ?? ''),
    snapshotRow('Timeline', cs.timeline),
    longService ? '' : snapshotRow('Service', service),
  ].join('');

  // Keep the featured quote in the hero only when it's short; a long one flows into
  // the content below, so the sidebar never holds long, word-by-word wrapped text.
  const heroLead = lead && lead.quote.length <= 180 ? lead : undefined;
  const overflowQuote = lead && !heroLead ? lead : undefined;
  const heroQuote = quoteCard(heroLead, clientName);
  const heroAside =
    snapshotHtml || heroQuote
      ? `<aside class="hero-side">${snapshotHtml ? `<div class="snap-list"><div class="side-label">Client snapshot</div>${snapshotHtml}</div>` : ''}${heroQuote}</aside>`
      : '';
  const eyebrow = isFilled(industryDisplay) ? industryDisplay : 'Client success story';

  // Long service text as its own section card, below the hero.
  const implementedHtml = longService
    ? `<section class="section"><div class="section-header"><div><div class="section-kicker">The work</div><h2>What was implemented</h2></div></div><div class="section-body"><p>${esc(service)}</p></div></section>`
    : '';
  // Overflow featured quote, rendered in the content flow rather than the hero.
  const overflowQuoteHtml = overflowQuote
    ? `<section class="section"><div class="section-body">${quoteCard(overflowQuote, clientName)}</div></section>`
    : '';

  // ── Key outcomes block: 2-col card grid for 4+, bullet list otherwise (thin data) ──
  const outcomesBody =
    keyOutcomes.length >= 4
      ? `<div class="outcome-grid">${keyOutcomes.map(outcomeCard).join('')}</div>`
      : `<ul>${keyOutcomes.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>`;
  const keyOutcomesHtml =
    keyOutcomes.length > 0
      ? `<section class="section"><div class="section-header"><div><div class="section-kicker">Outcomes</div><h2>Key outcomes</h2></div></div><div class="section-body">${outcomesBody}</div></section>`
      : '';

  // ── Narrative sections, with the results table injected after the
  //    results-themed section (or as a standalone block if none matches). ──
  const sectionsHtml = sections
    .map((sec, i) => {
      const card = narrativeSection(sec, `Chapter ${PAD(i)}`, clientName);
      const table =
        showResultsTable && i === resultsAnchor
          ? resultsTableSection(cs.results, 'By the numbers', 'The measurable change')
          : '';
      return card + table;
    })
    .join('');

  const fallbackTable =
    showResultsTable && resultsAnchor === -1
      ? resultsTableSection(cs.results, 'By the numbers', 'The numbers')
      : '';

  const conclusionHtml = isFilled(conclusion)
    ? `<section class="section"><div class="section-header"><div><div class="section-kicker">In closing</div><h2>The bottom line</h2></div></div><div class="section-body"><p>${esc(conclusion)}</p></div></section>`
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
  <section class="hero">
    <div class="hero-main">
      <div class="eyebrow">${esc(eyebrow)}</div>
      <h1>${esc(title)}</h1>
      ${isFilled(subheadline) ? `<p class="hero-subtitle">${esc(subheadline)}</p>` : ''}
    </div>
    ${heroAside}
  </section>
  ${metricsRow(cs.snapshot, cs.results)}
  <div class="content">
    ${overflowQuoteHtml}
    ${implementedHtml}
    ${keyOutcomesHtml}
    ${sectionsHtml}
    ${fallbackTable}
    ${conclusionHtml}
  </div>
</main>
</body>
</html>`;
}

/**
 * Print-first visual system adapted from `templates/casestudy.html`. System font
 * stack first (no network font dependency — rendering never blocks on a web font),
 * cream paper, accent maroon, rounded cards. `@page { margin: 0 }` + `.page-shell`
 * padding own the page margins; per-page branding is a slim Chromium running
 * header/footer (see `renderHtmlToPdf.ts`), not an in-flow topbar/footer.
 * break-inside rules keep cards intact across page breaks without hard breaks.
 */
const STYLES = `
/* Only set the size — the page margins are owned by Puppeteer's pdf() margin
   option so the running header/footer get reserved space. A '@page { margin: 0 }'
   here would override that and make the header/footer overlap page 2+ content. */
@page{size:A4;}
:root{--bg:#f5efe6;--paper:#fffaf3;--card:#fff;--ink:#251f1b;--muted:#6f6259;--soft:#eee2d2;--soft-2:#f7ead9;--accent:#9f2d25;--accent-dark:#6f1d17;--line:#e1d4c6;}
*{box-sizing:border-box;}
body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink);line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.page-shell{width:100%;max-width:none;padding:18px 32px;box-sizing:border-box;background:var(--paper);}
.hero{min-height:auto;padding:18px 0 24px;display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:28px;align-items:start;}
.hero-main{min-width:0;}
.eyebrow{display:inline-flex;padding:6px 12px;border-radius:999px;background:var(--soft);color:var(--accent-dark);font-weight:750;font-size:.72rem;letter-spacing:.04em;text-transform:uppercase;margin-bottom:16px;}
h1,h2{margin:0;letter-spacing:-.04em;line-height:1.1;}
h1{font-size:40px;line-height:.98;letter-spacing:-.04em;}
.hero-subtitle{color:var(--muted);font-size:1.02rem;line-height:1.5;margin-top:14px;max-width:92%;}
.hero-side{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px;display:flex;flex-direction:column;gap:16px;break-inside:avoid;page-break-inside:avoid;}
.side-label{color:var(--muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;font-weight:800;margin-bottom:10px;}
.snap-row{display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px solid var(--line);font-size:.86rem;}
.snap-row:last-child{border-bottom:none;}
.snap-label{color:var(--muted);font-weight:700;}
.snap-value{font-weight:750;text-align:right;}
.quote-card{border-left:4px solid var(--accent);background:#fff6ee;border-radius:14px;padding:16px;color:#3a2c25;font-weight:600;font-size:.95rem;break-inside:avoid;page-break-inside:avoid;}
.quote-card small{display:block;margin-top:10px;color:var(--muted);font-weight:700;}
.metrics-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-top:24px;break-inside:avoid;page-break-inside:avoid;}
.metric{background:var(--soft-2);border:1px solid #e8d4bf;border-radius:18px;padding:22px;min-height:118px;break-inside:avoid;page-break-inside:avoid;}
.metric-label{color:var(--muted);font-size:.74rem;text-transform:uppercase;letter-spacing:.06em;font-weight:850;}
.metric-value{display:block;font-size:2.3rem;line-height:1;font-weight:900;letter-spacing:-.06em;margin-top:8px;}
.metric-from{color:var(--muted);margin-top:6px;font-weight:700;font-size:.85rem;}
.content{padding:0;margin-top:24px;}
.section{margin-bottom:22px;background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;break-inside:avoid;page-break-inside:avoid;}
.section-header{padding:18px 22px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,#fff 0%,#fff9f0 100%);break-after:avoid;page-break-after:avoid;}
.section-kicker{color:var(--accent);font-size:.7rem;text-transform:uppercase;letter-spacing:.09em;font-weight:900;margin-bottom:7px;}
h2{font-size:1.45rem;}
.section-body{padding:20px 22px;font-size:14.5px;line-height:1.58;}
.section-body p{margin:0 0 12px;color:#3a2f28;}
.section-body p:last-child{margin-bottom:0;}
.section-body ul{margin:0;padding-left:1.2rem;}
.section-body li{margin:7px 0;color:#3a2f28;}
.section-body .quote-card{margin-top:16px;}
.outcome-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
.outcome-card{background:#fffaf5;border:1px solid var(--line);border-radius:12px;padding:14px;break-inside:avoid;page-break-inside:avoid;}
.outcome-card b{display:block;color:var(--accent-dark);margin-bottom:4px;font-size:.92rem;}
.outcome-card span{color:#3a2f28;font-size:.92rem;line-height:1.5;}
table{width:100%;border-collapse:collapse;background:#fffaf5;border-radius:14px;overflow:hidden;border:1px solid var(--line);break-inside:avoid;page-break-inside:avoid;}
th,td{padding:12px 14px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;font-size:.9rem;}
th{background:var(--soft);color:#4a382f;font-size:.74rem;text-transform:uppercase;letter-spacing:.06em;}
tr:last-child td{border-bottom:none;}
`;
