'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import type { LinkedInQuote } from '@/lib/types';

export function LinkedInQuoteCard({ quote }: { quote: LinkedInQuote }) {
  const linkedInText = `"${quote.quote}"\n\n— ${quote.context}`;

  return (
    <Card className="hover-lift">
      <CardContent className="flex items-start gap-5 p-6">
        {/* Left: the quote */}
        <div className="min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="font-editorial text-4xl italic leading-none text-accent"
          >
            “
          </span>
          <p className="-mt-2 font-editorial text-lg italic leading-relaxed text-ink">
            {quote.quote}
          </p>
        </div>

        {/* Right: attribution + copy */}
        <div className="flex w-[140px] shrink-0 flex-col items-start gap-3 border-l border-line pl-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
            — {quote.context}
          </p>
          <CopyButton value={linkedInText} variant="outline" size="sm">
            Copy
          </CopyButton>
        </div>
      </CardContent>
    </Card>
  );
}
