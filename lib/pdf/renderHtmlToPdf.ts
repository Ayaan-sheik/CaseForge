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
    const chromium = (await import('@sparticuz/chromium')).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const executablePath = await resolveLocalExecutablePath();
  return puppeteer.launch({
    args: ['--no-sandbox', '--font-render-hinting=none'],
    headless: true,
    // With no resolved path, puppeteer-core looks up an installed Chrome channel.
    ...(executablePath ? { executablePath } : { channel: 'chrome' }),
  });
}

export interface RenderHtmlToPdfOptions {
  /** Page format. Defaults to A4 to match the case-study template. */
  format?: 'A4' | 'Letter';
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
    const pdf = await page.pdf({
      format: options.format ?? 'A4',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
