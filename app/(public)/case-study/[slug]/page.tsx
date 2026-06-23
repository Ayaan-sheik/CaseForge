import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { isFilled } from '@/lib/utils/isFilled';
import { normalizeCaseStudy } from '@/lib/utils/normalizeCaseStudy';
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
  const title = `${cs.client_name} — case study`;
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
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

export default async function CaseStudyPage({ params }: { params: { slug: string } }) {
  const record = await getCaseStudy(params.slug);
  if (!record || !record.campaigns || !record.case_study) notFound();

  const cs: CaseStudy = normalizeCaseStudy(record.case_study);
  const clientName = record.campaigns.client_name;

  const snapshot = (cs.snapshot ?? []).filter(
    (s) => isFilled(s.metric) && (isFilled(s.before) || isFilled(s.after))
  );
  const results = (cs.results ?? []).filter(
    (r) => isFilled(r.metric) && (isFilled(r.before) || isFilled(r.after))
  );
  const steps = (cs.what_we_did ?? []).filter(isFilled);
  const quotes = (cs.quotes ?? []).filter((q) => isFilled(q.quote));

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

        {/* §1 Headline result */}
        <h1
          className="animate-fade-up mt-5 font-display text-[clamp(28px,4vw,40px)] font-semibold leading-tight tracking-[-0.025em]"
          style={{ animationDelay: '160ms' }}
        >
          {isFilled(cs.headline_result) ? cs.headline_result : clientName}
        </h1>

        {isFilled(cs.industry_size) && (
          <p
            className="animate-fade-up mt-3 font-mono text-[12px] uppercase tracking-[0.12em] text-ink-secondary"
            style={{ animationDelay: '200ms' }}
          >
            {cs.industry_size}
          </p>
        )}

        {/* §2 Snapshot — before → after */}
        {snapshot.length > 0 && (
          <div
            className="animate-fade-up mt-8 grid gap-4 rounded-[16px] border border-line bg-white p-5 sm:grid-cols-3"
            style={{ animationDelay: '260ms' }}
          >
            {snapshot.map((s, i) => (
              <div key={i}>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-secondary">
                  {s.metric}
                </p>
                <p className="mt-1.5 font-display text-[16px] font-semibold leading-tight text-ink">
                  {s.before} → {s.after}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* §3 The Challenge */}
        {isFilled(cs.challenge) && (
          <section className="animate-fade-up mt-12">
            <h2 className="eyebrow">The Challenge</h2>
            <p className="mt-4 max-w-[65ch] whitespace-pre-line text-[16px] leading-relaxed text-ink-secondary">
              {cs.challenge}
            </p>
          </section>
        )}

        {/* §4 Why they chose the provider */}
        {isFilled(cs.why_chose) && (
          <section className="animate-fade-up mt-12">
            <h2 className="eyebrow">
              Why they chose {isFilled(cs.provider_name) ? cs.provider_name : 'us'}
            </h2>
            <p className="mt-4 max-w-[65ch] whitespace-pre-line text-[16px] leading-relaxed text-ink-secondary">
              {cs.why_chose}
            </p>
          </section>
        )}

        {/* §5 What we did */}
        {steps.length > 0 && (
          <section className="animate-fade-up mt-12">
            <h2 className="eyebrow">What we did</h2>
            <ol className="mt-4 max-w-[65ch] list-decimal space-y-3 pl-5 text-[16px] leading-relaxed text-ink-secondary marker:font-mono marker:text-ink-secondary">
              {steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </section>
        )}

        {/* §6 The Results — Metric | Before | After */}
        {results.length > 0 && (
          <section className="animate-fade-up mt-12">
            <h2 className="eyebrow">The Results</h2>
            <div className="mt-5 overflow-hidden rounded-[16px] border border-line bg-white">
              <table className="w-full text-left text-[15px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-secondary">
                      Metric
                    </th>
                    <th className="px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-secondary">
                      Before
                    </th>
                    <th className="px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-secondary">
                      After
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      <td className="px-5 py-3 text-ink">{r.metric}</td>
                      <td className="px-5 py-3 text-ink-secondary">{r.before}</td>
                      <td className="px-5 py-3 font-semibold text-ink">{r.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* §7 In their words — verbatim quotes */}
        {quotes.length > 0 && (
          <section className="animate-fade-up mt-16 border-t border-line pt-14">
            <div className="space-y-10">
              {quotes.map((q, i) => (
                <figure key={i} className="text-center">
                  <blockquote className="mx-auto max-w-[24em] font-editorial text-[clamp(20px,2.6vw,26px)] font-medium italic leading-[1.45] tracking-[-0.01em]">
                    &ldquo;{q.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-5 font-mono text-[12px] uppercase tracking-[0.1em] text-ink-secondary">
                    — {isFilled(q.name) ? q.name : clientName}
                    {isFilled(q.title) && `, ${q.title}`}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* §8 Timeline */}
        {isFilled(cs.timeline) && (
          <section className="animate-fade-up mt-12 text-center">
            <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-ink-secondary">
              Timeline
            </p>
            <p className="mt-2 font-display text-[18px] font-semibold text-ink">{cs.timeline}</p>
          </section>
        )}

        {/* §9 CTA */}
        {isFilled(cs.cta) && (
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
