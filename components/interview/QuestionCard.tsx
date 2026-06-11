import { cn } from '@/lib/utils/cn';

/** Question display for the recording screen — readable at arm's length. */
export function QuestionCard({
  question,
  index,
  total,
}: {
  question: string;
  index: number;
  total: number;
}) {
  return (
    // Keyed by index so each new question re-runs the entrance animation
    <div
      key={index}
      className="animate-fade-up flex flex-col items-center gap-6 text-center"
    >
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1 w-8 rounded-full transition-colors duration-500',
                i < index
                  ? 'bg-paper'
                  : i === index
                    ? 'bg-accent'
                    : 'bg-paper/20'
              )}
            />
          ))}
        </div>
      </div>
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-paper/50">
        Question {index + 1} of {total}
      </span>
      <h1 className="max-w-xl text-balance font-display text-2xl font-semibold leading-snug tracking-tight text-paper sm:text-3xl">
        {question}
      </h1>
    </div>
  );
}
