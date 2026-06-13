import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';

export default async function InterviewDonePage({ params }: { params: { token: string } }) {
  const supabase = createAdminClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('client_name, creator_id')
    .eq('magic_token', params.token)
    .maybeSingle();

  let creatorName = 'They';
  if (campaign) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name, full_name')
      .eq('id', campaign.creator_id)
      .maybeSingle();
    creatorName = profile?.full_name || profile?.company_name || 'They';
  }

  return (
    <main className="flex min-h-screen flex-col bg-paper px-7 py-10">
      {/* Wordmark */}
      <Link
        href="/"
        className="inline-flex items-center gap-[9px] font-display text-[19px] font-semibold tracking-[-0.02em] text-ink no-underline"
      >
        <span className="h-[10px] w-[10px] flex-shrink-0 rounded-full bg-accent" />
        CaseForge
      </Link>

      {/* Done card */}
      <div className="mx-auto mt-16 w-full max-w-md">
        {/* Success icon */}
        <div className="animate-scale-in mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-success/15">
          <svg viewBox="0 0 24 24" fill="none" className="h-9 w-9" aria-hidden="true">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="#4CC38A"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="draw-check"
            />
          </svg>
        </div>

        {/* SAVED chip */}
        <div className="animate-fade-up mt-5 flex justify-center" style={{ animationDelay: '150ms' }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2">
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-success" />
            <span className="font-mono text-[12px] uppercase tracking-[0.12em] text-ink-secondary">
              Saved
            </span>
          </div>
        </div>

        <h1
          className="animate-fade-up mt-7 text-center font-display text-[clamp(28px,4vw,34px)] font-semibold leading-tight tracking-[-0.025em]"
          style={{ animationDelay: '200ms' }}
        >
          Thank you{campaign ? `, ${campaign.client_name}` : ''}.
        </h1>
        <p
          className="animate-fade-up mt-3 text-center font-editorial text-[19px] italic leading-relaxed text-ink-secondary"
          style={{ animationDelay: '320ms' }}
        >
          Your words are already becoming a story.
        </p>
        <p
          className="animate-fade-up mt-3 text-center text-[15px] leading-relaxed text-ink-secondary"
          style={{ animationDelay: '420ms' }}
        >
          Your answers have been submitted — {creatorName} will have their case study shortly. You can
          close this tab.
        </p>

        {/* Asset chips — what's being built */}
        <div
          className="animate-fade-up mt-8 flex flex-wrap justify-center gap-2"
          style={{ animationDelay: '600ms' }}
        >
          {['PDF case study', 'Hosted page', 'Quote cards'].map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 font-mono text-[11.5px] text-ink-secondary"
            >
              <span className="font-medium text-success">✓</span>
              {label}
            </span>
          ))}
        </div>

        {/* Footer branding */}
        <p
          className="animate-fade-up mt-10 text-center font-mono text-[11.5px] uppercase tracking-[0.12em] text-ink-secondary"
          style={{ animationDelay: '700ms' }}
        >
          Powered by CaseForge
        </p>
      </div>
    </main>
  );
}
