'use client';

import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface RecordButtonProps {
  recording: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

/**
 * Tap-to-record button: one tap starts, a second tap stops. `onPointerDown`
 * fires once per tap on both mouse and touch, so there's no hold-and-release
 * ambiguity (a click no longer starts-and-instantly-stops).
 */
export function RecordButton({ recording, disabled, onToggle }: RecordButtonProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {recording && (
          <>
            <span className="animate-ring absolute -inset-3 rounded-full bg-accent/50" />
            <span
              className="animate-ring absolute -inset-3 rounded-full bg-accent/30"
              style={{ animationDelay: '0.6s' }}
            />
          </>
        )}
        <button
          type="button"
          disabled={disabled}
          aria-label={recording ? 'Tap to stop recording' : 'Tap to record'}
          onPointerDown={(e) => {
            e.preventDefault();
            onToggle();
          }}
          onContextMenu={(e) => e.preventDefault()}
          className={cn(
            'relative flex h-[136px] w-[136px] select-none items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/50 disabled:opacity-50',
            recording
              ? 'scale-110 bg-accent shadow-xl shadow-accent/50'
              : 'bg-gradient-to-b from-[#F04438] to-[#D93426] shadow-xl shadow-accent/40 hover:scale-105 hover:from-[#D93426] hover:to-[#C02E21]'
          )}
          style={{ touchAction: 'none', WebkitUserSelect: 'none' }}
        >
          <Mic className="h-14 w-14 text-white drop-shadow-sm" />
        </button>
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-paper/60">
        {recording ? 'Tap to stop' : 'Tap to record'}
      </p>
    </div>
  );
}
