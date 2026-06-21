'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';

/** A verbatim pull quote, ready to drop into a LinkedIn post or sales deck. */
export function LinkedInQuoteCard({
  quote,
  attribution,
}: {
  quote: string;
  attribution: string;
}) {
  const copyText = `"${quote}"\n\n— ${attribution}`;

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
            {quote}
          </p>
        </div>

        {/* Right: attribution + copy */}
        <div className="flex w-[140px] shrink-0 flex-col items-start gap-3 border-l border-line pl-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
            — {attribution}
          </p>
          <CopyButton value={copyText} variant="outline" size="sm">
            Copy
          </CopyButton>
        </div>
      </CardContent>
    </Card>
  );
}
