import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCaseStudyBySlug } from '@/lib/supabase/getCaseStudyBySlug';
import { isFilled } from '@/lib/utils/isFilled';
import { buttonVariants } from '@/components/ui/button';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getCaseStudyBySlug(params.slug);
  if (!data) return { title: 'Case Study — CaseForge' };
  const { cs, campaign } = data;
  const title = `${campaign.client_name} — Case Study`;
  const description = isFilled(cs.headline_result) ? cs.headline_result : undefined;
  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
  };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

function hookText(challenge: string, max = 260): string {
  if (!isFilled(challenge)) return '';
  if (challenge.length <= max) return challenge;
  const cut = challenge.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return cut.slice(0, lastSpace > 0 ? lastSpace : max) + '…';
}

export default async function CaseStudyHookPage({ params }: { params: { slug: string } }) {
  const data = await getCaseStudyBySlug(params.slug);
  if (!data) notFound();

  const { cs, campaign, slug } = data;
  const clientName = campaign.client_name;

  const snapshot = (cs.snapshot ?? []).filter(
    (s) => isFilled(s.metric) && isFilled(s.after)
  ).slice(0, 3);
  const firstQuote = (cs.quotes ?? []).find((q) => isFilled(q.quote));
  const hook = hookText(cs.challenge);

  // Build client meta chips
  const chips = [cs.industry_size, cs.location, cs.team_size, cs.timeline]
    .filter((v) => isFilled(v ?? ''));

  return (
    <div className="min-h-screen bg-paper">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/88 backdrop-blur-[10px]">
        <div className="mx-auto flex h-[68px] max-w-2xl items-center px-7">
          <Link
            href="/"
            className="flex items-center gap-[9px] font-display text-[19px] font-semibold tracking-[-0.02em] text-ink no-underline"
          >
            <span className="h-[10px] w-[10px] flex-shrink-0 rounded-full bg-accent" />
            CaseForge
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-7 pb-24 pt-16">
        {/* Client avatar */}
        <div className="animate-scale-in flex h-14 w-14 items-center justify-center rounded-[14px] bg-ink font-display text-lg font-semibold text-paper">
          {initials(clientName)}
        </div>

        {/* Eyebrow */}
        <p className="animate-fade-up eyebrow mt-6" style={{ animationDelay: '60ms' }}>
          Case study · {campaign.service_provided}
        </p>

        {/* Headline */}
        <h1
          className="animate-fade-up mt-4 font-display text-[clamp(28px,4vw,42px)] font-semibold leading-tight tracking-[-0.03em] text-ink"
          style={{ animationDelay: '120ms' }}
        >
          {isFilled(cs.headline_result) ? cs.headline_result : clientName}
        </h1>

        {/* Client meta chips */}
        {chips.length > 0 && (
          <p
            className="animate-fade-up mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted"
            style={{ animationDelay: '160ms' }}
          >
            {chips.join(' · ')}
          </p>
        )}

        {/* Stat strip */}
        {snapshot.length > 0 && (
          <div
            className="animate-fade-up mt-10 grid gap-px overflow-hidden rounded-[18px] border border-line bg-line sm:grid-cols-3"
            style={{ animationDelay: '220ms' }}
          >
            {snapshot.map((s, i) => (
              <div key={i} className="bg-white px-5 py-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                  {s.metric}
                </p>
                <p className="mt-2 font-display text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink">
                  {s.after}
                </p>
                {isFilled(s.before) && (
                  <p className="mt-1.5 font-mono text-[10px] text-ink-secondary">
                    from {s.before}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Hook paragraph */}
        {hook && (
          <p
            className="animate-fade-up mt-10 max-w-[60ch] text-[17px] leading-[1.7] text-ink-secondary"
            style={{ animationDelay: '280ms' }}
          >
            {hook}
          </p>
        )}

        {/* Teaser quote */}
        {firstQuote && (
          <figure
            className="animate-fade-up mt-12 border-t border-line pt-10"
            style={{ animationDelay: '340ms' }}
          >
            <blockquote className="font-editorial text-[clamp(20px,2.6vw,26px)] font-medium italic leading-[1.5] tracking-[-0.01em] text-ink">
              &ldquo;{firstQuote.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-4 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-secondary">
              — {isFilled(firstQuote.name) ? firstQuote.name : clientName}
              {isFilled(firstQuote.title) && `, ${firstQuote.title}`}
            </figcaption>
          </figure>
        )}

        {/* Read More CTA */}
        <div
          className="animate-fade-up mt-12"
          style={{ animationDelay: '400ms' }}
        >
          <Link
            href={`/case-study/${slug}/read`}
            className={buttonVariants({ variant: 'accent', size: 'lg' })}
          >
            Read the full case study →
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-7 py-6">
          <Link
            href="/"
            className="flex items-center gap-[9px] font-display text-[15px] font-semibold tracking-[-0.02em] text-ink no-underline"
          >
            <span className="h-[8px] w-[8px] flex-shrink-0 rounded-full bg-accent" />
            CaseForge
          </Link>
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
            Made with CaseForge
          </p>
        </div>
      </footer>
    </div>
  );
}
