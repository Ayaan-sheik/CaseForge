import type { Metadata } from 'next';
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
      <strong key={i} className="font-semibold text-slate-900">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
        {heading}
      </h2>
      <div className="mt-3 text-base leading-relaxed text-slate-600">
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
    <main className="min-h-screen bg-white">
      <article className="mx-auto max-w-2xl px-6 py-16">
        {/* Initials avatar (company logo placeholder) */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white">
          {initials(clientName)}
        </div>

        <h1 className="mt-8 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
          {caseStudy.case_study_title}
        </h1>

        {caseStudy.case_study_summary && (
          <p className="mt-6 text-lg leading-relaxed text-slate-600">
            {caseStudy.case_study_summary}
          </p>
        )}

        {caseStudy.case_study_challenge && (
          <Section heading="The Challenge">
            <p>{caseStudy.case_study_challenge}</p>
          </Section>
        )}

        {caseStudy.case_study_solution && (
          <Section heading="The Solution">
            <p>{caseStudy.case_study_solution}</p>
          </Section>
        )}

        {caseStudy.case_study_results && (
          <Section heading="The Results">
            <p>{renderBoldMarkers(caseStudy.case_study_results)}</p>
          </Section>
        )}

        {caseStudy.testimonial_quote && (
          <figure className="mt-14 rounded-xl bg-slate-50 p-8">
            <p
              aria-hidden="true"
              className="text-5xl font-bold leading-none text-indigo-600"
            >
              &ldquo;
            </p>
            <blockquote className="mt-2 text-xl font-medium italic leading-relaxed text-slate-800">
              {caseStudy.testimonial_quote}
            </blockquote>
            <figcaption className="mt-4 text-sm font-semibold text-slate-500">
              — {clientName}
            </figcaption>
          </figure>
        )}

        <footer className="mt-16 border-t border-slate-200 pt-6 text-center text-sm text-slate-400">
          Powered by{' '}
          <span className="font-semibold text-indigo-600">CaseForge</span>
        </footer>
      </article>
    </main>
  );
}
