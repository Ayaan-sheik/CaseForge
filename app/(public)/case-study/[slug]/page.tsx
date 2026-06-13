import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import type { Output } from '@/lib/types';

interface CaseStudyRecord extends Output {
  campaigns: {
    client_name: string;
    service_provided: string;
  } | null;
}

async function getCaseStudy(slug: string): Promise<CaseStudyRecord | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('outputs')
    .select('*, campaigns(client_name, service_provided)')
    .eq('web_slug', slug)
    .maybeSingle<CaseStudyRecord>();
  return data ?? null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const caseStudy = await getCaseStudy(params.slug);
  if (!caseStudy) return { title: 'Case Study — CaseForge' };
  const title = caseStudy.case_study_title ?? 'Customer Success Story';
  const description = caseStudy.case_study_summary ?? '';
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
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

function renderBoldMarkers(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default async function CaseStudyPage({ params }: { params: { slug: string } }) {
  const caseStudy = await getCaseStudy(params.slug);
  if (!caseStudy || !caseStudy.campaigns) notFound();

  const clientName = caseStudy.campaigns.client_name;

  return (
    <div className="min-h-screen bg-paper">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/88 backdrop-blur-[10px]">
        <div className="mx-auto flex h-[68px] max-w-2xl items-center justify-between px-7">
          <Link
            href="/"
            className="flex items-center gap-[9px] font-display text-[19px] font-semibold tracking-[-0.02em] text-ink no-underline"
          >
            <span className="h-[10px] w-[10px] flex-shrink-0 rounded-full bg-accent" />
            CaseForge
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-7 py-16 sm:py-20">
        {/* Client avatar */}
        <div className="animate-scale-in flex h-16 w-16 items-center justify-center rounded-2xl bg-ink font-display text-xl font-semibold text-paper">
          {initials(clientName)}
        </div>

        <p
          className="animate-fade-up eyebrow mt-8"
          style={{ animationDelay: '80ms' }}
        >
          Case study · {caseStudy.campaigns.service_provided}
        </p>

        <h1
          className="animate-fade-up mt-5 font-display text-[clamp(28px,4vw,40px)] font-semibold leading-tight tracking-[-0.025em]"
          style={{ animationDelay: '160ms' }}
        >
          {caseStudy.case_study_title}
        </h1>

        {caseStudy.case_study_summary && (
          <p
            className="animate-fade-up mt-6 max-w-[60ch] font-editorial text-[20px] italic leading-relaxed text-ink-secondary"
            style={{ animationDelay: '260ms' }}
          >
            {caseStudy.case_study_summary}
          </p>
        )}

        {caseStudy.case_study_challenge && (
          <section className="animate-fade-up mt-12" style={{ animationDelay: '340ms' }}>
            <h2 className="eyebrow">The Challenge</h2>
            <p className="mt-4 max-w-[65ch] text-[16px] leading-relaxed text-ink-secondary">
              {caseStudy.case_study_challenge}
            </p>
          </section>
        )}

        {caseStudy.case_study_solution && (
          <section className="animate-fade-up mt-12" style={{ animationDelay: '420ms' }}>
            <h2 className="eyebrow">The Solution</h2>
            <p className="mt-4 max-w-[65ch] text-[16px] leading-relaxed text-ink-secondary">
              {caseStudy.case_study_solution}
            </p>
          </section>
        )}

        {caseStudy.case_study_results && (
          <section className="animate-fade-up mt-12" style={{ animationDelay: '500ms' }}>
            <h2 className="eyebrow">The Results</h2>
            <p className="mt-4 max-w-[65ch] text-[16px] leading-relaxed text-ink-secondary">
              {renderBoldMarkers(caseStudy.case_study_results)}
            </p>
          </section>
        )}

        {/* Voices-style testimonial */}
        {caseStudy.testimonial_quote && (
          <figure
            className="animate-fade-up mt-16 border-t border-line pt-14 text-center"
            style={{ animationDelay: '580ms' }}
          >
            <blockquote className="mx-auto max-w-[21em] font-editorial text-[clamp(22px,3vw,30px)] font-medium italic leading-[1.4] tracking-[-0.01em]">
              &ldquo;{caseStudy.testimonial_quote}&rdquo;
            </blockquote>
            <figcaption className="mt-6 font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink-secondary">
              — {clientName}
            </figcaption>
          </figure>
        )}

        {/* Footer */}
        <footer className="mt-16 flex items-center justify-between border-t border-line pt-8">
          <Link
            href="/"
            className="flex items-center gap-[9px] font-display text-[15px] font-semibold tracking-[-0.02em] text-ink no-underline"
          >
            <span className="h-[8px] w-[8px] flex-shrink-0 rounded-full bg-accent" />
            CaseForge
          </Link>
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-secondary">
            Made with CaseForge
          </p>
        </footer>
      </article>
    </div>
  );
}
