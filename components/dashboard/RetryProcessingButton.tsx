'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** "Retry Processing" — re-triggers synthesis for an errored campaign. */
export function RetryProcessingButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRetry() {
    setError('');
    setLoading(true);

    const res = await fetch(`/api/outputs/${campaignId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'synthesize' }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Retry failed — please try again.');
      setLoading(false);
      router.refresh();
      return;
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleRetry} disabled={loading} variant="destructive">
        <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
        {loading ? 'Processing…' : 'Retry Processing'}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
