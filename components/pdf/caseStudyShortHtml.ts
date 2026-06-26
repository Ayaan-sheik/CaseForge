// HTML-escape every user-supplied value before insertion.
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// The short-form template is embedded here so it is available in serverless
// environments without relying on filesystem access at runtime.
// Editorial 1-page (max 2) layout: dark hero + metrics + challenge/approach + outcomes + closing.
// Running header/footer are injected by Puppeteer — no inline topbar or footer here.
const TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Short-Form Case Study</title>
  <style>
    @page { size: A4; }

    :root {
      --bg: #fbfaf7;
      --card: #f2eadc;
      --text: #262322;
      --muted: #746d66;
      --accent: #9b342f;
      --border: #e5dac9;
      --dark: #1e1915;
      --accent-light: #e8a89c;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, Arial, Helvetica, sans-serif;
      font-size: 13px;
      line-height: 1.5;
    }

    .page {
      width: 210mm;
      padding: 12mm 14mm 10mm;
      margin: 0 auto;
      background: var(--bg);
    }

    /* ── Eyebrow ── */
    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.15em;
      font-size: 10px;
      font-weight: 800;
      margin-bottom: 8px;
      color: var(--accent);
    }

    .eyebrow-light {
      color: var(--accent-light);
    }

    /* ── Hero grid: dark left col + cream glance right ── */
    .hero-grid {
      display: grid;
      grid-template-columns: 1fr 188px;
      gap: 12px;
      align-items: stretch;
      margin-bottom: 12px;
    }

    .hero-left {
      background: var(--dark);
      border-radius: 14px;
      padding: 20px 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    h1 {
      font-size: 36px;
      line-height: 1.05;
      letter-spacing: -0.04em;
      margin: 0 0 10px;
      color: #ffffff;
    }

    .summary {
      color: rgba(255,255,255,0.65);
      font-size: 13px;
      margin: 0 0 14px;
      line-height: 1.55;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .tag {
      background: rgba(255,255,255,0.1);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 999px;
      padding: 3px 10px;
      font-size: 10px;
      font-weight: 700;
    }

    /* ── At-a-Glance sidebar ── */
    .glance {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 14px;
    }

    .glance-row {
      display: grid;
      grid-template-columns: 70px 1fr;
      gap: 4px;
      border-top: 1px solid var(--border);
      padding: 7px 0;
      font-size: 11px;
    }

    .glance-row:first-of-type { border-top: none; padding-top: 2px; }

    .label { color: var(--muted); font-weight: 700; }
    .value { text-align: right; font-weight: 800; font-size: 11px; }

    /* ── Metric strip ── */
    .metric-strip {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .metric-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-top: 3px solid var(--accent);
      border-radius: 0 0 12px 12px;
      padding: 12px 14px;
    }

    .metric-label {
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-size: 9px;
      font-weight: 900;
      margin-bottom: 6px;
    }

    .metric-value {
      font-size: 28px;
      line-height: 1;
      font-weight: 900;
      letter-spacing: -0.04em;
      color: var(--text);
    }

    .metric-sub {
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      margin-top: 4px;
    }

    /* ── Mid 2-col: Challenge + Approach ── */
    .mid-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 12px;
    }

    .section-heading {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0 0 8px;
      color: var(--text);
    }

    .challenge-text {
      color: var(--text);
      font-size: 12px;
      margin: 0 0 10px;
      line-height: 1.55;
    }

    .quote-block {
      border-left: 3px solid var(--accent);
      background: rgba(242,234,220,0.7);
      padding: 10px 14px;
      border-radius: 0 10px 10px 0;
      font-size: 12px;
      font-weight: 700;
      font-style: italic;
      line-height: 1.5;
    }

    .quote-source {
      display: block;
      margin-top: 6px;
      color: var(--muted);
      font-size: 10px;
      font-style: normal;
      font-weight: 700;
    }

    .approach-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 9px 0;
      border-top: 1px solid var(--border);
    }

    .approach-item:first-of-type { border-top: none; padding-top: 0; }

    .approach-num {
      color: var(--accent);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.1em;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .approach-label {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: -0.01em;
      line-height: 1.4;
    }

    /* ── Key outcomes ── */
    .outcomes-section {
      margin-bottom: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .outcomes-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 20px;
      margin-top: 8px;
    }

    .outcome-item {
      display: flex;
      align-items: baseline;
      gap: 8px;
      font-size: 12px;
      padding: 6px 0;
      border-top: 1px solid var(--border);
      line-height: 1.45;
    }

    .outcome-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--accent);
      flex-shrink: 0;
      margin-top: 5px;
    }

    /* ── Closing ── */
    .closing {
      border-left: 4px solid var(--accent);
      background: var(--card);
      padding: 14px 18px;
      border-radius: 0 14px 14px 0;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.55;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .closing-label {
      color: var(--muted);
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.13em;
      margin-bottom: 6px;
    }
  </style>
</head>

<body>
  <div class="page">

    <!-- Dark hero: headline + summary + tags | At-a-Glance -->
    <div class="hero-grid">
      <div class="hero-left">
        <div>
          <div class="eyebrow eyebrow-light">
            {{INDUSTRY_OR_CATEGORY}} &middot; {{TEAM_SIZE_SHORT}} &middot; {{PRIMARY_OUTCOME_CATEGORY}}
          </div>
          <h1>{{CASE_STUDY_HEADLINE}}</h1>
          <p class="summary">{{SHORT_SUMMARY_OF_TRANSFORMATION}}</p>
        </div>
        <div class="tags">
          <span class="tag">{{TAG_1}}</span>
          <span class="tag">{{TAG_2}}</span>
          <span class="tag">{{TAG_3}}</span>
        </div>
      </div>

      <aside class="glance">
        <div class="eyebrow">At a Glance</div>
        <div class="glance-row">
          <div class="label">Client</div>
          <div class="value">{{CLIENT_NAME}}</div>
        </div>
        <div class="glance-row">
          <div class="label">Industry</div>
          <div class="value">{{CLIENT_INDUSTRY}}</div>
        </div>
        <div class="glance-row">
          <div class="label">Team</div>
          <div class="value">{{TEAM_SIZE}}</div>
        </div>
        <div class="glance-row">
          <div class="label">Location</div>
          <div class="value">{{CLIENT_LOCATION}}</div>
        </div>
        <div class="glance-row">
          <div class="label">Timeline</div>
          <div class="value">{{PROJECT_TIMELINE}}</div>
        </div>
      </aside>
    </div>

    <!-- 3 Metric cards with accent top border -->
    <div class="metric-strip">
      <div class="metric-card">
        <div class="metric-label">{{METRIC_1_HEADING}}</div>
        <div class="metric-value">{{METRIC_1_AFTER_VALUE}}</div>
        <div class="metric-sub">from {{METRIC_1_BEFORE_VALUE}}</div>
        <div class="metric-sub">{{METRIC_1_TIMEFRAME}}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">{{METRIC_2_HEADING}}</div>
        <div class="metric-value">{{METRIC_2_AFTER_VALUE}}</div>
        <div class="metric-sub">from {{METRIC_2_BEFORE_VALUE}}</div>
        <div class="metric-sub">{{METRIC_2_TIMEFRAME}}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">{{METRIC_3_HEADING}}</div>
        <div class="metric-value">{{METRIC_3_AFTER_VALUE}}</div>
        <div class="metric-sub">from {{METRIC_3_BEFORE_VALUE}}</div>
        <div class="metric-sub">{{METRIC_3_TIMEFRAME}}</div>
      </div>
    </div>

    <!-- Challenge (left) + Approach (right) -->
    <div class="mid-grid">
      <div>
        <div class="eyebrow">The Challenge</div>
        <div class="section-heading">{{CHALLENGE_SECTION_HEADING}}</div>
        <p class="challenge-text">{{CHALLENGE_PARAGRAPH_1}}</p>
        <div class="quote-block">
          &ldquo;{{CUSTOMER_QUOTE_ABOUT_STARTING_PROBLEM}}&rdquo;
          <span class="quote-source">&mdash; {{QUOTE_SOURCE}}</span>
        </div>
      </div>

      <div>
        <div class="eyebrow">The Approach</div>
        <div class="section-heading">{{APPROACH_SECTION_HEADING}}</div>
        <div class="approach-item">
          <span class="approach-num">01</span>
          <span class="approach-label">{{APPROACH_CARD_1_HEADING}}</span>
        </div>
        <div class="approach-item">
          <span class="approach-num">02</span>
          <span class="approach-label">{{APPROACH_CARD_2_HEADING}}</span>
        </div>
        <div class="approach-item">
          <span class="approach-num">03</span>
          <span class="approach-label">{{APPROACH_CARD_3_HEADING}}</span>
        </div>
      </div>
    </div>

    <!-- Key Outcomes — break-inside: avoid keeps all 4 items together -->
    <div class="outcomes-section">
      <div class="eyebrow">Key Outcomes</div>
      <div class="outcomes-grid">
        <div class="outcome-item"><div class="outcome-dot"></div><span>{{KEY_OUTCOME_1}}</span></div>
        <div class="outcome-item"><div class="outcome-dot"></div><span>{{KEY_OUTCOME_2}}</span></div>
        <div class="outcome-item"><div class="outcome-dot"></div><span>{{KEY_OUTCOME_3}}</span></div>
        <div class="outcome-item"><div class="outcome-dot"></div><span>{{KEY_OUTCOME_4}}</span></div>
      </div>
    </div>

    <!-- Closing — never splits across pages -->
    <div class="closing">
      <div class="closing-label">In Closing</div>
      {{CLOSING_SUMMARY_PARAGRAPH}}
    </div>

  </div>
</body>
</html>`;

/**
 * Fill the short-form case study template with the provided placeholder values.
 * Every value is HTML-escaped before insertion. After filling, logs a warning
 * if any {{PLACEHOLDER}} tokens remain unfilled.
 */
export function buildCaseStudyShortHtml(content: Record<string, string>): string {
  const html = TEMPLATE.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key: string) => {
    const value = content[key];
    return esc(typeof value === 'string' && value.trim() ? value : '—');
  });

  const remaining = html.match(/\{\{[A-Z0-9_]+\}\}/g);
  if (remaining) {
    console.warn('[caseStudyShortHtml] Unfilled placeholders:', Array.from(new Set(remaining)));
  }

  return html;
}
