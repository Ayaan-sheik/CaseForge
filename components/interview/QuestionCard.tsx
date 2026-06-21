import { cn } from '@/lib/utils/cn';

/**
 * Question display for the recording screen — readable at arm's length.
 * `coreNumber` is the 1-based core question we're on; `coreCount` the total
 * core questions. Follow-ups reuse their core's number and show a softer label.
 */
export function QuestionCard({
  question,
  coreNumber,
  coreCount,
  isFollowup,
  animKey,
}: {
  question: string;
  coreNumber: number;
  coreCount: number;
  isFollowup: boolean;
  animKey: number;
}) {
  return (
    // Keyed so each new question re-runs the entrance animation
    <div
      key={animKey}
      className="animate-fade-up flex flex-col items-center gap-6 text-center"
    >
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: coreCount }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-1 w-8 rounded-full transition-colors duration-500',
              i < coreNumber - 1
                ? 'bg-paper'
                : i === coreNumber - 1
                  ? 'bg-accent'
                  : 'bg-paper/20'
            )}
          />
        ))}
      </div>
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-paper/50">
        {isFollowup ? 'Quick follow-up' : `Question ${coreNumber} of ${coreCount}`}
      </span>
      <h1 className="max-w-xl text-balance font-display text-2xl font-semibold leading-snug tracking-tight text-paper sm:text-3xl">
        {question}
      </h1>
    </div>
  );
}
