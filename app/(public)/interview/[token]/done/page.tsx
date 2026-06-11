import { createAdminClient } from '@/lib/supabase/server';
import { LogoMark } from '@/components/ui/logo';

export default async function InterviewDonePage({
  params,
}: {
  params: { token: string };
}) {
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
    <main className="flex min-h-screen items-center justify-center bg-paper p-6">
      <div className="max-w-md text-center">
        <div className="animate-scale-in mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/15">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-10 w-10"
            aria-hidden="true"
          >
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="#2E8B61"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="draw-check"
            />
          </svg>
        </div>

        <h1
          className="animate-fade-up mt-8 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
          style={{ animationDelay: '200ms' }}
        >
          Thank you{campaign ? `, ${campaign.client_name}` : ''}.
        </h1>
        <p
          className="animate-fade-up mt-4 font-editorial text-xl italic leading-relaxed text-ink-secondary"
          style={{ animationDelay: '350ms' }}
        >
          Your words are already becoming a story.
        </p>
        <p
          className="animate-fade-up mt-3 text-base leading-relaxed text-ink-secondary"
          style={{ animationDelay: '450ms' }}
        >
          Your answers have been submitted — {creatorName} will have their
          case study shortly. You can close this tab.
        </p>

        <div
          className="animate-fade-up mt-12 flex items-center justify-center gap-2"
          style={{ animationDelay: '600ms' }}
        >
          <LogoMark className="h-5 w-5 rounded-md" />
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            Powered by CaseForge
          </p>
        </div>
      </div>
    </main>
  );
}
