'use client';

import { Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopyButton } from '@/components/ui/copy-button';
import { PDFPreview } from '@/components/outputs/PDFPreview';
import { LinkedInQuoteCard } from '@/components/outputs/LinkedInQuoteCard';
import type { Output } from '@/lib/types';

interface OutputTabsProps {
  output: Output;
  appUrl: string;
}

export function OutputTabs({ output, appUrl }: OutputTabsProps) {
  const publicLink = `${appUrl}/case-study/${output.web_slug}`;
  const quotes = output.linkedin_quotes ?? [];

  return (
    <Tabs defaultValue="pdf">
      <TabsList>
        <TabsTrigger value="pdf">PDF Case Study</TabsTrigger>
        <TabsTrigger value="web">Web Page</TabsTrigger>
        <TabsTrigger value="linkedin">LinkedIn Quotes</TabsTrigger>
      </TabsList>

      <TabsContent value="pdf" className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {output.pdf_url && (
            <a href={output.pdf_url} download target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </a>
          )}
        </div>
        {output.pdf_url ? (
          <PDFPreview pdfUrl={output.pdf_url} />
        ) : (
          <p className="text-sm text-ink-secondary">
            No PDF available yet.
          </p>
        )}
      </TabsContent>

      <TabsContent value="web" className="space-y-4">
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
      </TabsContent>

      <TabsContent value="linkedin" className="space-y-4">
        <p className="font-editorial text-base italic text-ink-muted">
          Post one per week — three weeks of proof from a single interview.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {quotes.map((quote, index) => (
            <LinkedInQuoteCard key={index} quote={quote} />
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
