import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  FileText,
  Globe,
  Link2,
  Mic,
  Quote,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Logo, LogoMark } from '@/components/ui/logo';
import { Reveal } from '@/components/ui/reveal';

const WAVE_HEIGHTS = [14, 26, 38, 30, 44, 34, 22, 40, 28, 16, 32, 20];

const STEPS = [
  {
    icon: Link2,
    title: 'Send a magic link',
    body: 'Tell us the client and the work you did. We write three sharp interview questions and hand you a link to share.',
  },
  {
    icon: Mic,
    title: 'They talk for 90 seconds',
    body: 'Your client answers by voice, right from their phone. No call to schedule, no app to install, no typing.',
  },
  {
    icon: Sparkles,
    title: 'You get the case study',
    body: 'We transcribe, clean, and synthesize their words into a polished story — ready to publish and share.',
  },
];

const OUTPUTS = [
  {
    icon: FileText,
    title: 'PDF case study',
    body: 'A designed, branded document with the challenge, solution, and results — ready to attach to any proposal.',
  },
  {
    icon: Globe,
    title: 'Hosted web page',
    body: 'A clean public page with its own link. Drop it in your portfolio, your site, or your next cold email.',
  },
  {
    icon: Quote,
    title: 'LinkedIn quotes',
    body: 'Three punchy, post-ready quotes in your client’s own voice. One per week, three weeks of proof.',
  },
];

export default async function LandingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Logo />
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
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-5 pb-24 pt-36 sm:px-8 sm:pt-44">
          {/* ambient glow */}
          <div
            aria-hidden="true"
            className="animate-drift pointer-events-none absolute left-1/2 top-0 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-indigo-100/50 blur-[120px]"
          />

          <div className="relative mx-auto max-w-3xl text-center">
            <p
              className="animate-fade-up mx-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
              style={{ animationDelay: '0ms' }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Async voice case studies for B2B
            </p>

            <h1
              className="animate-fade-up mt-8 text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl"
              style={{ animationDelay: '90ms' }}
            >
              Client case studies,
              <br />
              <span className="text-slate-400">without the call.</span>
            </h1>

            <p
              className="animate-fade-up mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-slate-500"
              style={{ animationDelay: '180ms' }}
            >
              Send one link. Your client answers three questions with their
              voice — 90 seconds on their phone. You get a polished PDF, a
              public page, and LinkedIn quotes.
            </p>

            <div
              className="animate-fade-up mt-10 flex items-center justify-center gap-3"
              style={{ animationDelay: '270ms' }}
            >
              <Link href="/signup">
                <Button size="lg">
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Log in
                </Button>
              </Link>
            </div>
          </div>

          {/* ── Hero visual: interview card ─────────────────── */}
          <div
            className="animate-scale-in relative mx-auto mt-20 max-w-md"
            style={{ animationDelay: '400ms' }}
          >
            <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_64px_-24px_rgb(0_0_0/0.18)]">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                Question 1 of 3
              </p>
              <p className="mt-3 text-balance text-lg font-medium leading-snug">
                What measurable result did you see after the email automation
                launched?
              </p>

              <div className="mt-8 flex h-12 items-center justify-center gap-1">
                {WAVE_HEIGHTS.map((h, i) => (
                  <span
                    key={i}
                    className="wave-bar w-1 rounded-full bg-indigo-500"
                    style={{
                      height: `${h}px`,
                      animationDelay: `${i * 0.11}s`,
                    }}
                  />
                ))}
              </div>

              <div className="mt-8 flex items-center justify-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 shadow-lg shadow-slate-900/20">
                  <Mic className="h-5 w-5 text-white" />
                </span>
              </div>
              <p className="mt-3 text-center text-xs text-slate-400">
                Hold to record
              </p>
            </div>

            {/* floating output chips */}
            <div className="pointer-events-none absolute -left-8 top-8 hidden rotate-[-4deg] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-md md:block">
              📄 PDF ready
            </div>
            <div className="pointer-events-none absolute -right-10 bottom-12 hidden rotate-[3deg] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-md md:block">
              💬 3 LinkedIn quotes
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────── */}
        <section className="border-t border-slate-100 px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                How it works
              </p>
              <h2 className="mx-auto mt-4 max-w-lg text-balance text-center text-3xl font-semibold tracking-tight sm:text-4xl">
                From “great working with you” to published proof.
              </h2>
            </Reveal>

            <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
              {STEPS.map((step, i) => (
                <Reveal key={step.title} delay={i * 120}>
                  <div className="flex flex-col items-start">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <step.icon className="h-5 w-5 text-slate-700" />
                    </div>
                    <p className="mt-5 text-xs font-medium text-slate-400">
                      0{i + 1}
                    </p>
                    <h3 className="mt-1.5 text-lg font-semibold tracking-tight">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
                      {step.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Outputs ───────────────────────────────────────── */}
        <section className="border-t border-slate-100 bg-slate-50/60 px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                What you get
              </p>
              <h2 className="mx-auto mt-4 max-w-md text-balance text-center text-3xl font-semibold tracking-tight sm:text-4xl">
                One interview. Three assets.
              </h2>
            </Reveal>

            <div className="mt-16 grid gap-5 md:grid-cols-3">
              {OUTPUTS.map((output, i) => (
                <Reveal key={output.title} delay={i * 120}>
                  <div className="hover-lift h-full rounded-2xl border border-slate-200/80 bg-white p-7">
                    <output.icon className="h-5 w-5 text-indigo-600" />
                    <h3 className="mt-5 text-base font-semibold tracking-tight">
                      {output.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      {output.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────── */}
        <section className="px-5 py-24 sm:px-8">
          <Reveal>
            <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-slate-900 px-8 py-20 text-center sm:py-24">
              <div
                aria-hidden="true"
                className="animate-drift pointer-events-none absolute left-1/2 top-0 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[100px]"
              />
              <div className="relative">
                <h2 className="mx-auto max-w-xl text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Your best work deserves better than a testimonial request
                  email.
                </h2>
                <p className="mx-auto mt-4 max-w-md text-pretty text-base text-slate-400">
                  Create your first campaign in two minutes. Free to start.
                </p>
                <Link href="/signup" className="mt-9 inline-block">
                  <Button
                    size="lg"
                    className="bg-white text-slate-900 hover:bg-slate-100"
                  >
                    Create a campaign
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-6 w-6 rounded-lg" />
            <span className="text-sm font-medium text-slate-500">
              CaseForge
            </span>
          </div>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} CaseForge. Async voice case studies.
          </p>
        </div>
      </footer>
    </div>
  );
}
