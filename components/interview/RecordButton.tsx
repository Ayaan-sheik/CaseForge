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
          'flex h-24 w-24 items-center justify-center rounded-full transition-all select-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/50 disabled:opacity-50',
          recording
            ? 'scale-110 animate-pulse bg-red-500 shadow-lg shadow-red-500/40'
            : 'bg-indigo-600 shadow-lg shadow-indigo-600/40 hover:bg-indigo-500'
        )}
        style={{ touchAction: 'none', WebkitUserSelect: 'none' }}
      >
        <Mic className="h-10 w-10 text-white" />
      </button>
      <p className="text-sm font-medium text-slate-300">
        {recording ? 'Release to Stop' : 'Hold to Record'}
      </p>
    </div>
  );
}
