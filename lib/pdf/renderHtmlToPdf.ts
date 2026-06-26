import type { Browser } from 'puppeteer-core';

/**
 * Render an HTML string to a PDF Buffer with headless Chromium.
 *
 * This is the single seam between "what the PDF looks like" (HTML/CSS, built by
 * the caller) and "how it becomes a PDF" (a browser engine). Keeping it behind
 * one small interface means the engine can be swapped — e.g. to a hosted
 * Browserless endpoint — without touching the template or callers.
 *
 * Environment handling:
 *  - On Vercel / Lambda we launch the bundled `@sparticuz/chromium` binary via
 *    `puppeteer-core` (full `puppeteer` is too large for serverless).
 *  - Locally we reuse the Chromium that the dev-only `puppeteer` package
 *    downloads, or a `PUPPETEER_EXECUTABLE_PATH` / system Chrome fallback.
 *
 * Reliability is prioritised over font fidelity: the template must self-contain
 * its fonts (system stack or bundled), and we never block rendering on a network
 * fetch — `setContent` waits for `load`, not `networkidle`, so a slow or blocked
 * external resource can't hang or fail PDF generation.
 */

const isServerless = (): boolean =>
  Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

/** Resolve a Chromium executable for local development. */
async function resolveLocalExecutablePath(): Promise<string | undefined> {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  try {
    // Dev-only dependency; absent in production where the serverless path runs.
    // Cast loosely (its types vary by version, and it isn't a prod dependency).
    const mod = (await import('puppeteer')) as unknown as {
      default?: { executablePath?: (...args: unknown[]) => unknown };
      executablePath?: (...args: unknown[]) => unknown;
    };
    const fn = mod.executablePath ?? mod.default?.executablePath;
    if (typeof fn === 'function') {
      const path = await fn();
      if (typeof path === 'string' && path) return path;
    }
  } catch {
    // full `puppeteer` not installed — fall through to a system-Chrome channel
  }
  return undefined;
}

async function launchBrowser(): Promise<Browser> {
  const puppeteer = (await import('puppeteer-core')).default;

  if (isServerless()) {
    const token = process.env.BROWSERLESS_TOKEN;
    if (!token) throw new Error('BROWSERLESS_TOKEN env var is not set');
    return puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${token}`,
    });
  }

  const executablePath = await resolveLocalExecutablePath();
  return puppeteer.launch({
    args: ['--no-sandbox', '--font-render-hinting=none'],
    headless: 'shell',
    // With no resolved path, puppeteer-core looks up an installed Chrome channel.
    ...(executablePath ? { executablePath } : { channel: 'chrome' }),
  });
}

/** Escape user-provided text (e.g. client name) before it goes in a template. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface RunningHeader {
  left: string;
  right: string;
}
export interface RunningFooter {
  left: string;
}

export interface RenderHtmlToPdfOptions {
  /** Page format. Defaults to A4 to match the case-study template. */
  format?: 'A4' | 'Letter';
  /** Slim per-page running header (Chromium repeats it on every page). */
  runningHeader?: RunningHeader;
  /** Slim per-page running footer; page numbers are appended automatically. */
  runningFooter?: RunningFooter;
}

// Chromium header/footer templates are isolated documents: no shared CSS, the
// default font-size is 0, so everything is inline-styled with an explicit size.
// Horizontal padding (32px) matches `.page-shell` so they read as inset.
function buildHeaderTemplate(h: RunningHeader): string {
  return `<div style="width:100%;font-family:Arial,Helvetica,sans-serif;font-size:9px;color:#6f6259;padding:0 32px;-webkit-print-color-adjust:exact;">
  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e1d4c6;padding-bottom:6px;">
    <span style="display:flex;align-items:center;gap:5px;font-weight:700;color:#251f1b;"><span style="display:inline-block;background:#9f2d25;color:#fff;font-weight:800;border-radius:3px;padding:1px 4px;font-size:8px;">CF</span>${escapeHtml(h.left)}</span>
    <span>${escapeHtml(h.right)}</span>
  </div>
</div>`;
}

function buildFooterTemplate(f: RunningFooter): string {
  return `<div style="width:100%;font-family:Arial,Helvetica,sans-serif;font-size:9px;color:#6f6259;padding:0 32px;-webkit-print-color-adjust:exact;">
  <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid #e1d4c6;padding-top:6px;">
    <span>${escapeHtml(f.left)}</span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>
</div>`;
}

export async function renderHtmlToPdf(
  html: string,
  options: RenderHtmlToPdfOptions = {}
): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    // 'load' (not 'networkidle0') so a slow/blocked external resource — e.g. a
    // web font — can never hang or fail rendering. The template self-contains
    // its fonts, so the visual result does not depend on the network.
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 });
    const useHeaderFooter = Boolean(options.runningHeader || options.runningFooter);
    const pdf = await page.pdf({
      format: options.format ?? 'A4',
      printBackground: true,
      displayHeaderFooter: useHeaderFooter,
      // A harmless empty span suppresses Chromium's default date/URL chrome when
      // only one of header/footer is supplied.
      headerTemplate: options.runningHeader
        ? buildHeaderTemplate(options.runningHeader)
        : '<span></span>',
      footerTemplate: options.runningFooter
        ? buildFooterTemplate(options.runningFooter)
        : '<span></span>',
      // Reserve top/bottom space so the running header/footer never overlap content.
      margin: useHeaderFooter
        ? { top: '72px', right: '0px', bottom: '56px', left: '0px' }
        : { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
