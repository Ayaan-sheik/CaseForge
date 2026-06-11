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
    <div className="flex flex-col items-center gap-6 text-center">
      <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-slate-300">
        Question {index + 1} of {total}
      </span>
      <h1 className="max-w-xl text-2xl font-semibold leading-snug text-white sm:text-3xl">
        {question}
      </h1>
    </div>
  );
}
