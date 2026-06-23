'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Re-renders just the PDF from the stored case study (no LLM) — e.g. to pick up a template change. */
export function RegeneratePDFButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegenerate() {
    setError('');
    setLoading(true);

    const res = await fetch(`/api/outputs/${campaignId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'regenerate_pdf' }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Regeneration failed — please try again.');
      setLoading(false);
      return;
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleRegenerate} disabled={loading} variant="outline" size="sm">
        <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
        {loading ? 'Regenerating…' : 'Regenerate PDF'}
      </Button>
      {error && <p className="text-sm text-accent">{error}</p>}
    </div>
  );
}
