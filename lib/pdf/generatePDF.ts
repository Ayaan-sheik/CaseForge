import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { createAdminClient } from '@/lib/supabase/server';
import CaseStudyPDF, {
  type CaseStudyPDFProps,
} from '@/components/pdf/CaseStudyPDF';

export async function generatePDF(props: CaseStudyPDFProps): Promise<Buffer> {
  return renderToBuffer(
    React.createElement(CaseStudyPDF, props) as React.ReactElement
  );
}

/** Render the case study PDF and upload it to Supabase Storage. Returns the public URL. */
export async function generateAndUploadPDF(
  campaignId: string,
  props: CaseStudyPDFProps
): Promise<string> {
  const buffer = await generatePDF(props);
  const supabase = createAdminClient();
  const path = `${campaignId}.pdf`;

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

  return publicUrl;
}
