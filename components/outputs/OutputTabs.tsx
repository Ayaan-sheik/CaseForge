'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopyButton } from '@/components/ui/copy-button';
import { PDFPreview } from '@/components/outputs/PDFPreview';
import { LinkedInQuoteCard } from '@/components/outputs/LinkedInQuoteCard';
import type { Output } from '@/lib/types';

interface OutputTabsProps {
  campaignId: string;
  output: Output;
  appUrl: string;
}

export function OutputTabs({ campaignId, output, appUrl }: OutputTabsProps) {
  const router = useRouter();
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');

  const publicLink = `${appUrl}/case-study/${output.web_slug}`;
  const quotes = output.linkedin_quotes ?? [];

  async function handleRegeneratePDF() {
    setError('');
    setRegenerating(true);

    const res = await fetch(`/api/outputs/${campaignId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'regenerate_pdf' }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'PDF regeneration failed.');
    } else {
      router.refresh();
    }
    setRegenerating(false);
  }

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
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegeneratePDF}
            disabled={regenerating}
          >
            <RefreshCw
              className={regenerating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
            />
            {regenerating ? 'Regenerating…' : 'Regenerate PDF'}
          </Button>
          {error && <p className="text-sm text-accent">{error}</p>}
        </div>
        {output.pdf_url ? (
          <PDFPreview pdfUrl={output.pdf_url} />
        ) : (
          <p className="text-sm text-ink-secondary">
            No PDF yet — try regenerating.
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
