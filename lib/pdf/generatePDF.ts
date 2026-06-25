import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { createAdminClient } from '@/lib/supabase/server';
import CaseStudyPDF, {
  type CaseStudyPDFProps,
} from '@/components/pdf/CaseStudyPDF';
import { buildCaseStudyLongHtml } from '@/components/pdf/caseStudyLongHtml';
import { renderHtmlToPdf } from '@/lib/pdf/renderHtmlToPdf';

/** Which PDF to render: the short-form one-pager or the long-form story. */
export type PdfVariant = 'short' | 'long';

export async function generatePDF(
  props: CaseStudyPDFProps,
  variant: PdfVariant = 'short'
): Promise<Buffer> {
  // Long-form renders an HTML template (the casestudy.html visual system) via
  // headless Chromium; short-form stays on @react-pdf's React renderer.
  if (variant === 'long') {
    return renderHtmlToPdf(buildCaseStudyLongHtml(props));
  }
  return renderToBuffer(
    React.createElement(CaseStudyPDF, props) as React.ReactElement
  );
}

/** Render one variant and upload it to Supabase Storage. Returns the public URL. */
export async function generateAndUploadPDF(
  campaignId: string,
  props: CaseStudyPDFProps,
  variant: PdfVariant = 'short'
): Promise<string> {
  const buffer = await generatePDF(props, variant);
  const supabase = createAdminClient();
  const path = `${campaignId}-${variant}.pdf`;

  const { error } = await supabase.storage
    .from('pdfs')
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) throw new Error(`PDF storage upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from('pdfs').getPublicUrl(path);

  // The storage path is fixed (upsert), so the public URL is stable. Append a
  // version param so re-rendered PDFs aren't served stale from browser/CDN cache.
  return `${publicUrl}?v=${Date.now()}`;
}

/** Render and upload both the short-form and long-form PDFs. */
export async function generateAndUploadBothPDFs(
  campaignId: string,
  props: CaseStudyPDFProps
): Promise<{ pdfUrl: string; pdfUrlLong: string }> {
  const [pdfUrl, pdfUrlLong] = await Promise.all([
    generateAndUploadPDF(campaignId, props, 'short'),
    generateAndUploadPDF(campaignId, props, 'long'),
  ]);
  return { pdfUrl, pdfUrlLong };
}
