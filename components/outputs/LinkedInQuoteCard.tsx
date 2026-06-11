'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import type { LinkedInQuote } from '@/lib/types';

export function LinkedInQuoteCard({ quote }: { quote: LinkedInQuote }) {
  const linkedInText = `"${quote.quote}"\n\n— ${quote.context}`;

  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-4 p-6">
        <p className="flex-1 text-lg font-medium leading-relaxed text-slate-900">
          &ldquo;{quote.quote}&rdquo;
        </p>
        <p className="text-sm text-slate-500">— {quote.context}</p>
        <CopyButton value={linkedInText} variant="outline" size="sm">
          Copy
        </CopyButton>
      </CardContent>
    </Card>
  );
}
