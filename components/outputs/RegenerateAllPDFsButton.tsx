'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Re-renders every owned campaign's PDF from its stored case study (no LLM) — e.g. after a template change. */
export function RegenerateAllPDFsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleRegenerateAll() {
    setMessage('');
    setLoading(true);

    const res = await fetch('/api/outputs/regenerate-all', { method: 'POST' });
    const data = await res.json().catch(() => ({}));

    setLoading(false);

    if (!res.ok) {
      setMessage(data.error ?? 'Regeneration failed — please try again.');
      return;
    }

    const failedNote = data.failed ? `, ${data.failed} failed` : '';
    setMessage(`Regenerated ${data.regenerated ?? 0} PDF${data.regenerated === 1 ? '' : 's'}${failedNote}.`);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button onClick={handleRegenerateAll} disabled={loading} variant="outline">
        <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
        {loading ? 'Regenerating all…' : 'Regenerate all PDFs'}
      </Button>
      {message && <p className="text-sm text-ink-secondary">{message}</p>}
    </div>
  );
}
