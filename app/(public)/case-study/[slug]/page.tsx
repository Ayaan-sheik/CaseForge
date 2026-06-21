import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import type { CaseStudy, Output } from '@/lib/types';

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
  const record = await getCaseStudy(params.slug);
  const cs = record?.case_study;
  if (!cs) return { title: 'Case Study — CaseForge' };
  return {
    title: cs.title,
    description: cs.exec_summary,
    openGraph: { title: cs.title, description: cs.exec_summary, type: 'article' },
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

export default async function CaseStudyPage({ params }: { params: { slug: string } }) {
  const record = await getCaseStudy(params.slug);
  if (!record || !record.campaigns || !record.case_study) notFound();

  const cs: CaseStudy = record.case_study;
  const clientName = record.campaigns.client_name;

  const snapCells = [
    cs.snapshot?.industry && { label: 'Industry', value: cs.snapshot.industry },
    cs.snapshot?.size && { label: 'Company size', value: cs.snapshot.size },
    cs.snapshot?.headline_metric && { label: 'Headline result', value: cs.snapshot.headline_metric },
  ].filter(Boolean) as { label: string; value: string }[];

  const stats = cs.results?.stats ?? [];
  const quotes = cs.pull_quotes ?? [];

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

        <p className="animate-fade-up eyebrow mt-8" style={{ animationDelay: '80ms' }}>
          Case study · {record.campaigns.service_provided}
        </p>

        <h1
          className="animate-fade-up mt-5 font-display text-[clamp(28px,4vw,40px)] font-semibold leading-tight tracking-[-0.025em]"
          style={{ animationDelay: '160ms' }}
        >
          {cs.title}
        </h1>

        {/* Snapshot strip */}
        {snapCells.length > 0 && (
          <div
            className="animate-fade-up mt-8 grid grid-cols-3 gap-4 rounded-[16px] border border-line bg-white p-5"
            style={{ animationDelay: '220ms' }}
          >
            {snapCells.map((c) => (
              <div key={c.label}>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-secondary">
                  {c.label}
                </p>
                <p className="mt-1.5 font-display text-[16px] font-semibold leading-tight text-ink">
                  {c.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Executive summary */}
        {cs.exec_summary && (
          <p
            className="animate-fade-up mt-8 max-w-[60ch] font-editorial text-[20px] italic leading-relaxed text-ink-secondary"
            style={{ animationDelay: '300ms' }}
          >
            {cs.exec_summary}
          </p>
        )}

        {/* The Problem */}
        {cs.problem && (
          <section className="animate-fade-up mt-12">
            <h2 className="eyebrow">The Problem</h2>
            <p className="mt-4 max-w-[65ch] whitespace-pre-line text-[16px] leading-relaxed text-ink-secondary">
              {cs.problem}
            </p>
          </section>
        )}

        {/* The Solution */}
        {cs.solution && (
          <section className="animate-fade-up mt-12">
            <h2 className="eyebrow">The Solution</h2>
            <p className="mt-4 max-w-[65ch] whitespace-pre-line text-[16px] leading-relaxed text-ink-secondary">
              {cs.solution}
            </p>
          </section>
        )}

        {/* The Results */}
        {(stats.length > 0 || cs.results?.prose) && (
          <section className="animate-fade-up mt-12">
            <h2 className="eyebrow">The Results</h2>
            {stats.length > 0 && (
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {stats.map((s, i) => (
                  <div key={i} className="rounded-[16px] border border-line bg-white p-5">
                    <p className="font-display text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink">
                      {s.value}
                    </p>
                    <p className="mt-2 text-[13px] leading-snug text-ink-secondary">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
            {cs.results?.prose && (
              <p className="mt-5 max-w-[65ch] text-[16px] leading-relaxed text-ink-secondary">
                {cs.results.prose}
              </p>
            )}
          </section>
        )}

        {/* In their words — verbatim pull quotes */}
        {quotes.length > 0 && (
          <section className="animate-fade-up mt-16 border-t border-line pt-14">
            <div className="space-y-10">
              {quotes.map((q, i) => (
                <figure key={i} className="text-center">
                  <blockquote className="mx-auto max-w-[24em] font-editorial text-[clamp(20px,2.6vw,26px)] font-medium italic leading-[1.45] tracking-[-0.01em]">
                    &ldquo;{q}&rdquo;
                  </blockquote>
                  <figcaption className="mt-5 font-mono text-[12px] uppercase tracking-[0.1em] text-ink-secondary">
                    — {clientName}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* About the company */}
        {cs.about_company && (
          <section className="animate-fade-up mt-16 rounded-[16px] border border-line bg-white p-6">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-secondary">
              About {clientName}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-secondary">{cs.about_company}</p>
          </section>
        )}

        {/* CTA */}
        {cs.cta && (
          <section className="animate-fade-up mt-12 text-center">
            <p className="mx-auto max-w-[40ch] font-display text-[20px] font-semibold leading-snug tracking-[-0.01em]">
              {cs.cta}
            </p>
          </section>
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
