import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, FileText, Globe, Quote } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Logo, LogoMark } from '@/components/ui/logo';
import { Reveal } from '@/components/ui/reveal';
import { HeroDemo } from '@/components/landing/HeroDemo';

const OLD_WAY = [
  { time: 'Week 1', text: '“Quick call to capture your story?” Three scheduling emails. No reply.' },
  { time: 'Week 3', text: 'A 45-minute Zoom your client politely endures.' },
  { time: 'Week 5', text: 'The recording sits in a folder named “case study — draft”.' },
  { time: 'Week 9', text: 'You write it yourself from memory. The numbers are fuzzy.' },
];

const NEW_WAY = [
  { time: 'Minute 1', text: 'You type the client’s name and what you did for them.' },
  { time: 'Minute 2', text: 'A link lands in their inbox with three sharp questions.' },
  { time: 'Their lunch break', text: 'They answer out loud from their phone. 90 seconds.' },
  { time: 'Same hour', text: 'A finished case study, in their words, with their numbers.' },
];

const STEPS = [
  {
    number: '01',
    title: 'You describe the work',
    body: 'Client name, service provided — that’s the whole form. We write three interview questions that go after the numbers, the before-and-after, and the recommendation.',
  },
  {
    number: '02',
    title: 'They answer out loud',
    body: 'Your client gets one link. No account, no app, no calendar invite. They hold a button, talk naturally for 90 seconds, and get back to their day.',
  },
  {
    number: '03',
    title: 'The story writes itself',
    body: 'We transcribe their answers, clean the filler, and keep every metric verbatim. What comes back is a case study — not a transcript.',
  },
];

const DELIVERABLES = [
  {
    icon: FileText,
    title: 'A client-ready PDF',
    body: 'Challenge, solution, results — designed and typeset, ready to attach to your next proposal without touching a layout tool.',
  },
  {
    icon: Globe,
    title: 'A page that sells for you',
    body: 'A clean public link with its own URL. Drop it in your portfolio, your pitch deck, or the cold email you’re writing right now.',
  },
  {
    icon: Quote,
    title: 'Three weeks of LinkedIn proof',
    body: 'Three post-ready quotes in your client’s own voice. One per week — a month of credibility from one link.',
  },
];

export default async function LandingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-page items-center justify-between px-5 sm:px-8">
          <Logo animated />
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-sm">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="text-sm">
                Get started
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* ── Hero: 50/50 story + demonstration ─────────────── */}
        <section className="px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
          <div className="mx-auto grid max-w-page items-center gap-14 lg:grid-cols-2 lg:gap-10">
            <div>
              <p
                className="animate-fade-up font-mono text-xs uppercase tracking-[0.18em] text-ink-muted"
                style={{ animationDelay: '0ms' }}
              >
                Async voice case studies
              </p>

              <h1
                className="animate-fade-up mt-6 text-balance font-display text-5xl font-semibold leading-[1.04] tracking-tight sm:text-6xl"
                style={{ animationDelay: '90ms' }}
              >
                Your clients have the story.{' '}
                <span className="font-editorial italic text-accent">
                  Let them tell it.
                </span>
              </h1>

              <p
                className="animate-fade-up mt-6 max-w-[52ch] text-pretty text-lg leading-relaxed text-ink-secondary"
                style={{ animationDelay: '180ms' }}
              >
                Send one link. Your client answers three questions out loud —
                90 seconds, on their phone, between meetings. You get a
                finished case study in their own words, with their own numbers.
              </p>

              <div
                className="animate-fade-up mt-9 flex flex-wrap items-center gap-4"
                style={{ animationDelay: '270ms' }}
              >
                <Link href="/signup">
                  <Button size="lg">
                    Start free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link
                  href="#how-it-works"
                  className="text-sm font-medium text-ink-secondary underline-offset-4 transition-colors hover:text-ink hover:underline"
                >
                  See how it works
                </Link>
              </div>

              <p
                className="animate-fade-up mt-10 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted"
                style={{ animationDelay: '360ms' }}
              >
                90 seconds of their time · zero calls · no app
              </p>
            </div>

            <div
              className="animate-scale-in flex justify-center lg:justify-end"
              style={{ animationDelay: '300ms' }}
            >
              <HeroDemo />
            </div>
          </div>
        </section>

        {/* ── Problem: the old way vs this way ──────────────── */}
        <section className="border-t border-line bg-subtle/60 px-5 py-24 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-page">
            <Reveal>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-muted">
                The problem
              </p>
              <h2 className="mt-4 max-w-2xl text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                The case study every consultant{' '}
                <span className="font-editorial italic">means</span> to write
              </h2>
              <p className="mt-4 max-w-[58ch] text-pretty text-base leading-relaxed text-ink-secondary">
                It isn’t that the work wasn’t great. It’s that capturing the
                story costs two people a meeting neither of them wants.
              </p>
            </Reveal>

            <div className="mt-14 grid gap-6 md:grid-cols-2">
              <Reveal>
                <div className="h-full rounded-[20px] border border-line bg-surface/60 p-7 sm:p-8">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                    The old way
                  </p>
                  <ul className="mt-6 space-y-5">
                    {OLD_WAY.map((item) => (
                      <li key={item.time} className="flex gap-4">
                        <span className="w-20 shrink-0 pt-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                          {item.time}
                        </span>
                        <p className="text-[15px] leading-relaxed text-ink-secondary">
                          {item.text}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              <Reveal delay={140}>
                <div className="hover-lift h-full rounded-[20px] border border-line bg-surface p-7 shadow-[0_1px_2px_rgb(25_21_16/0.03)] sm:p-8">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
                    With CaseForge
                  </p>
                  <ul className="mt-6 space-y-5">
                    {NEW_WAY.map((item) => (
                      <li key={item.time} className="flex gap-4">
                        <span className="w-20 shrink-0 pt-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                          {item.time}
                        </span>
                        <p className="text-[15px] leading-relaxed text-ink">
                          {item.text}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Process ───────────────────────────────────────── */}
        <section id="how-it-works" className="px-5 py-24 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-page">
            <Reveal>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-muted">
                How it works
              </p>
              <h2 className="mt-4 max-w-xl text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                From “great working with you” to{' '}
                <span className="font-editorial italic">published proof</span>
              </h2>
            </Reveal>

            <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
              {STEPS.map((step, i) => (
                <Reveal key={step.number} delay={i * 130}>
                  <div className="border-t-2 border-ink pt-6">
                    <p className="font-mono text-xs text-ink-muted">
                      {step.number}
                    </p>
                    <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-[44ch] text-[15px] leading-relaxed text-ink-secondary">
                      {step.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* Metrics */}
            <div className="mt-20 grid gap-10 border-t border-line pt-14 sm:grid-cols-3">
              {[
                { value: '90 sec', label: 'of your client’s time, total' },
                { value: '3', label: 'finished assets per interview' },
                { value: '0', label: 'calls scheduled, ever' },
              ].map((metric, i) => (
                <Reveal key={metric.label} delay={i * 130}>
                  <div>
                    <p className="font-display text-5xl font-semibold tracking-tight sm:text-6xl">
                      {metric.value}
                    </p>
                    <p className="mt-2 text-sm text-ink-secondary">
                      {metric.label}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Deliverables ──────────────────────────────────── */}
        <section className="border-t border-line bg-subtle/60 px-5 py-24 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-page">
            <Reveal>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-muted">
                What you get
              </p>
              <h2 className="mt-4 max-w-lg text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                One interview.{' '}
                <span className="font-editorial italic">Three assets.</span>
              </h2>
            </Reveal>

            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {DELIVERABLES.map((item, i) => (
                <Reveal key={item.title} delay={i * 130}>
                  <div className="hover-lift h-full rounded-[20px] border border-line bg-surface p-7">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft">
                      <item.icon className="h-5 w-5 text-accent" />
                    </span>
                    <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-secondary">
                      {item.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonial ───────────────────────────────────── */}
        <section className="px-5 py-28 sm:px-8 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-muted">
                From an early user
              </p>
              <blockquote className="mt-8 text-balance font-editorial text-3xl italic leading-snug text-ink sm:text-4xl">
                “I sent the link at 9am, slightly embarrassed to ask. By lunch
                I had a case study{' '}
                <span className="bg-accent-soft px-1 text-accent">
                  better than anything I’d ever written
                </span>{' '}
                about my own work.”
              </blockquote>
              <p className="mt-8 font-mono text-xs uppercase tracking-[0.16em] text-ink-muted">
                Fractional CMO · B2B SaaS
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────── */}
        <section className="px-5 pb-24 sm:px-8">
          <Reveal>
            <div className="mx-auto max-w-page rounded-[28px] bg-ink px-8 py-20 text-center sm:py-24">
              <h2 className="mx-auto max-w-2xl text-balance font-display text-3xl font-semibold tracking-tight text-paper sm:text-4xl">
                Your best work deserves better than{' '}
                <span className="font-editorial italic text-accent-soft">
                  “could you write us a testimonial?”
                </span>
              </h2>
              <p className="mx-auto mt-5 max-w-md text-pretty text-base text-paper/60">
                Create your first campaign in two minutes. Free to start — no
                card, no call.
              </p>
              <Link href="/signup" className="mt-9 inline-block">
                <Button
                  size="lg"
                  className="bg-paper text-ink hover:bg-white"
                >
                  Create a campaign
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-line px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-page flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-6 w-6 rounded-lg" />
            <span className="font-display text-sm font-medium text-ink-secondary">
              CaseForge
            </span>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            © {new Date().getFullYear()} CaseForge · async voice case studies
          </p>
        </div>
      </footer>
    </div>
  );
}
