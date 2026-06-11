import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { LogoMark } from '@/components/ui/logo';
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

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const caseStudy = await getCaseStudy(params.slug);
  if (!caseStudy) {
    return { title: 'Case Study — CaseForge' };
  }
  const title = caseStudy.case_study_title ?? 'Customer Success Story';
  const description = caseStudy.case_study_summary ?? '';
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
    },
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

/** Render `**bold**` markers from the synthesized results text. */
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

function Section({
  heading,
  children,
  delay,
}: {
  heading: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <section
      className="animate-fade-up mt-12"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h2 className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-accent">
        {heading}
      </h2>
      <div className="mt-4 max-w-[65ch] text-base leading-relaxed text-ink-secondary">
        {children}
      </div>
    </section>
  );
}

export default async function CaseStudyPage({
  params,
}: {
  params: { slug: string };
}) {
  const caseStudy = await getCaseStudy(params.slug);
  if (!caseStudy || !caseStudy.campaigns) notFound();

  const clientName = caseStudy.campaigns.client_name;

  return (
    <main className="min-h-screen bg-paper">
      <article className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
        {/* Initials avatar (company logo placeholder) */}
        <div className="animate-scale-in flex h-16 w-16 items-center justify-center rounded-2xl bg-ink font-display text-xl font-semibold text-paper">
          {initials(clientName)}
        </div>

        <p
          className="animate-fade-up mt-8 font-mono text-xs uppercase tracking-[0.18em] text-ink-muted"
          style={{ animationDelay: '80ms' }}
        >
          Case study · {caseStudy.campaigns.service_provided}
        </p>

        <h1
          className="animate-fade-up mt-4 text-balance font-display text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl"
          style={{ animationDelay: '160ms' }}
        >
          {caseStudy.case_study_title}
        </h1>

        {caseStudy.case_study_summary && (
          <p
            className="animate-fade-up mt-6 max-w-[60ch] font-editorial text-xl italic leading-relaxed text-ink-secondary"
            style={{ animationDelay: '260ms' }}
          >
            {caseStudy.case_study_summary}
          </p>
        )}

        {caseStudy.case_study_challenge && (
          <Section heading="The Challenge" delay={340}>
            <p>{caseStudy.case_study_challenge}</p>
          </Section>
        )}

        {caseStudy.case_study_solution && (
          <Section heading="The Solution" delay={420}>
            <p>{caseStudy.case_study_solution}</p>
          </Section>
        )}

        {caseStudy.case_study_results && (
          <Section heading="The Results" delay={500}>
            <p>{renderBoldMarkers(caseStudy.case_study_results)}</p>
          </Section>
        )}

        {caseStudy.testimonial_quote && (
          <figure
            className="animate-fade-up mt-14 rounded-[20px] border border-line bg-surface p-8 shadow-[0_1px_2px_rgb(25_21_16/0.03)]"
            style={{ animationDelay: '580ms' }}
          >
            <p
              aria-hidden="true"
              className="font-editorial text-5xl italic leading-none text-accent"
            >
              “
            </p>
            <blockquote className="mt-2 font-editorial text-2xl italic leading-relaxed text-ink">
              {caseStudy.testimonial_quote}
            </blockquote>
            <figcaption className="mt-5 font-mono text-xs uppercase tracking-[0.16em] text-ink-muted">
              — {clientName}
            </figcaption>
          </figure>
        )}

        <footer className="mt-16 flex items-center justify-center gap-2 border-t border-line pt-8">
          <LogoMark className="h-5 w-5 rounded-md" />
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            Made with CaseForge
          </p>
        </footer>
      </article>
    </main>
  );
}
