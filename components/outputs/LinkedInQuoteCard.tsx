'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import type { LinkedInQuote } from '@/lib/types';

export function LinkedInQuoteCard({ quote }: { quote: LinkedInQuote }) {
  const linkedInText = `"${quote.quote}"\n\n— ${quote.context}`;

  return (
    <Card className="hover-lift">
      <CardContent className="flex h-full flex-col gap-4 p-6">
        <span
          aria-hidden="true"
          className="font-editorial text-4xl italic leading-none text-accent"
        >
          “
        </span>
        <p className="-mt-3 flex-1 font-editorial text-lg italic leading-relaxed text-ink">
          {quote.quote}
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
          — {quote.context}
        </p>
        <CopyButton value={linkedInText} variant="outline" size="sm">
          Copy
        </CopyButton>
      </CardContent>
    </Card>
  );
}
