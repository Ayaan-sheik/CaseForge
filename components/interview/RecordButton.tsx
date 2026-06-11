'use client';

import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface RecordButtonProps {
  recording: boolean;
  disabled?: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
}

/**
 * Hold-to-record button. Pointer events give unified mouse + touch behavior;
 * pointer capture keeps the release event even if the finger drifts off the
 * button.
 */
export function RecordButton({
  recording,
  disabled,
  onPressStart,
  onPressEnd,
}: RecordButtonProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {recording && (
          <>
            <span className="animate-ring absolute inset-0 rounded-full bg-accent/50" />
            <span
              className="animate-ring absolute inset-0 rounded-full bg-accent/30"
              style={{ animationDelay: '0.6s' }}
            />
          </>
        )}
        <button
          type="button"
          disabled={disabled}
          aria-label={recording ? 'Release to stop recording' : 'Hold to record'}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            onPressStart();
          }}
          onPointerUp={() => onPressEnd()}
          onPointerCancel={() => onPressEnd()}
          onContextMenu={(e) => e.preventDefault()}
          className={cn(
            'relative flex h-24 w-24 select-none items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/50 disabled:opacity-50',
            recording
              ? 'scale-110 bg-accent shadow-lg shadow-accent/40'
              : 'bg-accent shadow-lg shadow-accent/30 hover:scale-105 hover:bg-[#D93426]'
          )}
          style={{ touchAction: 'none', WebkitUserSelect: 'none' }}
        >
          <Mic className="h-10 w-10 text-white" />
        </button>
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-paper/60">
        {recording ? 'Release to stop' : 'Hold to record'}
      </p>
    </div>
  );
}
