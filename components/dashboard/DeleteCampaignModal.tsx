'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CONFIRM_PHRASE = 'delete this campaign';

interface DeleteCampaignModalProps {
  clientName: string;
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteCampaignModal({
  clientName,
  campaignId,
  isOpen,
  onClose,
  onDeleted,
}: DeleteCampaignModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Lock background scroll and allow Escape-to-close while open.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const confirmed = confirmText.trim().toLowerCase() === CONFIRM_PHRASE;

  function handleClose() {
    if (loading) return;
    setConfirmText('');
    setError(null);
    onClose();
  }

  async function handleDelete() {
    if (!confirmed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Delete failed');
      }
      onDeleted();
      setConfirmText('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed — please try again');
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Delete campaign for ${clientName}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-md"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="animate-fade-up relative z-10 w-full max-w-md rounded-[24px] bg-paper shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-accent" />
              <p className="font-display text-[17px] font-semibold tracking-tight">
                Delete {clientName}
              </p>
            </div>
            <p className="mt-1 text-[13px] text-ink-secondary">
              This permanently removes the campaign, its recordings, and any
              generated outputs. This cannot be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label
              htmlFor="delete-confirm"
              className="text-[13px] text-ink-secondary"
            >
              To confirm, type{' '}
              <code className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[12px] text-ink">
                {CONFIRM_PHRASE}
              </code>{' '}
              below.
            </label>
            <Input
              id="delete-confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoComplete="off"
              autoFocus
              className="mt-2"
            />
          </div>

          {error && <p className="text-sm text-accent">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!confirmed || loading}
            >
              {loading ? 'Deleting…' : 'Delete campaign'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
