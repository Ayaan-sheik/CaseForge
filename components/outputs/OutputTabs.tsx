'use client';

import { useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopyButton } from '@/components/ui/copy-button';
import { PDFPreview } from '@/components/outputs/PDFPreview';
import { RegeneratePDFButton } from '@/components/outputs/RegeneratePDFButton';
import { LinkedInQuoteCard } from '@/components/outputs/LinkedInQuoteCard';
import { isFilled } from '@/lib/utils/isFilled';
import type { Output } from '@/lib/types';

interface OutputTabsProps {
  output: Output;
  appUrl: string;
  clientName: string;
}

export function OutputTabs({ output, appUrl, clientName }: OutputTabsProps) {
  const hasWebPage = Boolean(output.web_slug);
  const publicLink = `${appUrl}/case-study/${output.web_slug}`;
  const quotes = (output.case_study?.quotes ?? []).filter((q) => isFilled(q.quote));

  // Prefer the long-form in the preview when it exists; fall back to short.
  const [previewVariant, setPreviewVariant] = useState<'long' | 'short'>(
    output.pdf_url_long ? 'long' : 'short'
  );
  const previewUrl = previewVariant === 'long' ? output.pdf_url_long : output.pdf_url;

  return (
    <Tabs defaultValue="pdf">
      <TabsList>
        <TabsTrigger value="pdf">PDF Case Study</TabsTrigger>
        <TabsTrigger value="web">Web Page</TabsTrigger>
        <TabsTrigger value="linkedin">LinkedIn Quotes</TabsTrigger>
      </TabsList>

      <TabsContent value="pdf" className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {output.pdf_url_long && (
            <a href={output.pdf_url_long} download target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                Download long-form
              </Button>
            </a>
          )}
          {output.pdf_url && (
            <a href={output.pdf_url} download target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                Download short-form
              </Button>
            </a>
          )}
          {output.case_study && <RegeneratePDFButton campaignId={output.campaign_id} />}
        </div>
        {(output.pdf_url_long || output.pdf_url) && (
          <div className="flex items-center gap-2">
            <Button
              variant={previewVariant === 'long' ? 'default' : 'outline'}
              size="sm"
              disabled={!output.pdf_url_long}
              onClick={() => setPreviewVariant('long')}
            >
              Long-form
            </Button>
            <Button
              variant={previewVariant === 'short' ? 'default' : 'outline'}
              size="sm"
              disabled={!output.pdf_url}
              onClick={() => setPreviewVariant('short')}
            >
              Short-form
            </Button>
          </div>
        )}
        {previewUrl ? (
          <PDFPreview pdfUrl={previewUrl} />
        ) : (
          <p className="text-sm text-ink-secondary">
            No PDF available yet.
          </p>
        )}
      </TabsContent>

      <TabsContent value="web" className="space-y-4">
        {hasWebPage ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <CopyButton value={publicLink} variant="outline" size="sm">
                Copy Public Link
              </CopyButton>
              <a href={publicLink} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4" />
                  Open in new tab
                </Button>
              </a>
            </div>
            <iframe
              src={publicLink}
              title="Public case study preview"
              className="h-[640px] w-full rounded-[20px] border border-line bg-surface shadow-sm"
            />
          </>
        ) : (
          <p className="text-sm text-ink-secondary">
            No public page available yet.
          </p>
        )}
      </TabsContent>

      <TabsContent value="linkedin" className="space-y-4">
        <p className="font-editorial text-base italic text-ink-muted">
          Post one per week — three weeks of proof from a single interview.
        </p>
        <div className="space-y-4">
          {quotes.map((q, index) => (
            <LinkedInQuoteCard
              key={index}
              quote={q.quote}
              attribution={isFilled(q.name) ? q.name : clientName}
            />
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
