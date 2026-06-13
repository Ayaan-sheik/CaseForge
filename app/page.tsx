import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HeroDemo } from '@/components/landing/HeroDemo';
import { NavScrollBorder } from '@/components/landing/NavScrollBorder';
import { Reveal } from '@/components/ui/reveal';

export default async function LandingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-paper text-ink">
      <NavScrollBorder />
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-transparent bg-paper/88 backdrop-blur-[10px] transition-[border-color] duration-300 [&.scrolled]:border-line" id="nav">
        <div className="mx-auto flex h-[68px] max-w-page items-center justify-between px-7">
          <Link
            href="/"
            className="flex items-center gap-[9px] font-display text-[21px] font-semibold tracking-[-0.02em] text-ink no-underline"
          >
            <span className="h-[11px] w-[11px] flex-shrink-0 rounded-full bg-accent" />
            CaseForge
          </Link>
          <nav className="flex items-center gap-[30px]">
            <Link href="#how" className="hidden text-[15px] font-medium text-ink-secondary transition-colors hover:text-ink sm:block">
              How it works
            </Link>
            <Link href="#outputs" className="hidden text-[15px] font-medium text-ink-secondary transition-colors hover:text-ink sm:block">
              What you get
            </Link>
            <Link href="/login" className="hidden text-[15px] font-medium text-ink-secondary transition-colors hover:text-ink sm:block">
              Log in
            </Link>
            <Link
              href="/signup"
              className="flex items-center gap-[10px] rounded-full bg-ink px-[22px] py-[12px] font-sans text-[15px] font-semibold text-paper transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(25,21,16,0.18)]"
            >
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-accent transition-transform group-hover:scale-150" />
              Start an interview
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="px-7 pb-24 pt-[84px]">
          <div className="mx-auto grid max-w-page items-center gap-16 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="eyebrow animate-fade-up" style={{ animationDelay: '0ms' }}>
                Async customer interviews
              </p>
              <h1
                className="animate-fade-up mt-[22px] font-display text-[clamp(40px,5.2vw,62px)] font-semibold leading-[1.02] tracking-[-0.03em]"
                style={{ animationDelay: '90ms' }}
              >
                Case studies,{' '}
                <em className="font-editorial font-medium not-italic italic tracking-[-0.01em]">
                  minus the calendar.
                </em>
              </h1>
              <p
                className="animate-fade-up mt-6 max-w-[46ch] text-[19px] leading-[1.55] text-ink-secondary"
                style={{ animationDelay: '180ms' }}
              >
                Send your client one magic link. They answer a few questions{' '}
                <strong className="font-semibold text-ink">out loud, on their phone</strong>, whenever
                they have five minutes. CaseForge turns the recording into a polished case study, a
                hosted page, and quote cards.
              </p>
              <div
                className="animate-fade-up mt-9 flex flex-wrap items-center gap-[18px]"
                style={{ animationDelay: '270ms' }}
              >
                <Link
                  href="/signup"
                  className="flex items-center gap-[10px] rounded-full bg-ink px-[22px] py-[12px] font-sans text-[15px] font-semibold text-paper transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(25,21,16,0.18)]"
                >
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
                  Send your first link
                </Link>
                <Link
                  href="#how"
                  className="px-1.5 text-[15px] font-semibold text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-accent"
                >
                  Hear how it works
                </Link>
              </div>
              <p
                className="animate-fade-up mt-[18px] font-mono text-[12.5px] text-ink-secondary"
                style={{ animationDelay: '360ms' }}
              >
                No scheduling. No app for your client. First 3 interviews free.
              </p>
            </div>

            <div className="animate-scale-in flex justify-center lg:justify-end" style={{ animationDelay: '300ms' }}>
              <HeroDemo />
            </div>
          </div>
        </section>

        {/* ── Compare ─────────────────────────────────────────── */}
        <section className="border-t border-line px-7 py-24">
          <div className="mx-auto max-w-page">
            <Reveal>
              <div className="mb-16 max-w-[620px]">
                <p className="eyebrow">The problem</p>
                <h2 className="mt-[18px] font-display text-[clamp(30px,3.6vw,42px)] font-semibold leading-[1.08] tracking-[-0.025em]">
                  Your proof is stuck in{' '}
                  <em className="font-editorial font-medium not-italic italic">
                    someone else&rsquo;s calendar.
                  </em>
                </h2>
                <p className="mt-4 text-[18px] text-ink-secondary">
                  Your happiest customer wants to help. Their schedule doesn&rsquo;t. So the
                  testimonial that should close your next ten deals dies in a reschedule thread.
                </p>
              </div>
            </Reveal>
            <Reveal>
              <div className="compare-grid">
                {/* Then column */}
                <div className="compare-col">
                  <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-ink-secondary">
                    The usual way
                  </p>
                  <div className="mt-[34px]">
                    <div className="pb-[30px]">
                      <p className="font-display text-[46px] font-semibold leading-none tracking-[-0.03em] text-ink-secondary">
                        47 days
                      </p>
                      <p className="mt-1.5 text-[15px] text-ink-secondary">
                        average time from &ldquo;sure, happy to help&rdquo; to published case study
                      </p>
                    </div>
                    <div className="border-t border-dashed border-line py-[30px]">
                      <p className="font-display text-[46px] font-semibold leading-none tracking-[-0.03em] text-ink-secondary">
                        9 emails
                      </p>
                      <p className="mt-1.5 text-[15px] text-ink-secondary">
                        of scheduling, rescheduling, and gentle nudging
                      </p>
                    </div>
                    <div className="border-t border-dashed border-line pt-[30px]">
                      <p className="font-display text-[46px] font-semibold leading-none tracking-[-0.03em] text-ink-secondary">
                        2 calls
                      </p>
                      <p className="mt-1.5 text-[15px] text-ink-secondary">
                        an hour of your client&rsquo;s week, plus prep on both sides
                      </p>
                    </div>
                  </div>
                </div>
                {/* Now column */}
                <div className="compare-col now">
                  <p className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.14em] text-accent">
                    <span className="h-2 w-2 rounded-full bg-accent" />
                    With CaseForge
                  </p>
                  <div className="mt-[34px]">
                    <div className="pb-[30px]">
                      <p className="font-display text-[46px] font-semibold leading-none tracking-[-0.03em]">
                        5 minutes
                      </p>
                      <p className="mt-1.5 text-[15px] text-ink-secondary">
                        of your client talking — from a cab, a couch, an airport gate
                      </p>
                    </div>
                    <div className="border-t border-dashed border-line py-[30px]">
                      <p className="font-display text-[46px] font-semibold leading-none tracking-[-0.03em]">
                        1 link
                      </p>
                      <p className="mt-1.5 text-[15px] text-ink-secondary">
                        no app to install, no account to create, no invite to accept
                      </p>
                    </div>
                    <div className="border-t border-dashed border-line pt-[30px]">
                      <p className="font-display text-[46px] font-semibold leading-none tracking-[-0.03em]">
                        0 meetings
                      </p>
                      <p className="mt-1.5 text-[15px] text-ink-secondary">
                        the assets arrive in your inbox, ready to ship
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── How It Works ────────────────────────────────────── */}
        <section id="how" className="px-7 py-24">
          <div className="mx-auto max-w-page">
            <Reveal>
              <div className="mb-16 max-w-[620px]">
                <p className="eyebrow">How it works</p>
                <h2 className="mt-[18px] font-display text-[clamp(30px,3.6vw,42px)] font-semibold leading-[1.08] tracking-[-0.025em]">
                  The whole thing fits on a{' '}
                  <em className="font-editorial font-medium not-italic italic">five-minute tape.</em>
                </h2>
              </div>
            </Reveal>
            <Reveal>
              <div className="tape-rail">
                {[
                  {
                    ts: '00:00',
                    title: 'AI drafts the interview',
                    body: 'Tell CaseForge the deal, the product, and the metric you want. It writes sharp, specific questions that dig for numbers — not "tell us about your experience."',
                    last: false,
                  },
                  {
                    ts: '00:10',
                    title: 'You send the magic link',
                    body: 'One link in one email. It opens straight to the questions in your client\'s browser — phone or laptop, no login, no download.',
                    last: false,
                  },
                  {
                    ts: '00:30',
                    title: 'They answer out loud',
                    body: 'Like a short podcast interview, minus the host. Your client taps record and talks through each question whenever a free moment shows up.',
                    last: false,
                  },
                  {
                    ts: '05:00',
                    title: 'The assets arrive',
                    body: 'CaseForge transcribes, pulls the metrics, cleans the rambles, and designs the deliverables. You review, your client approves with one tap.',
                    last: true,
                  },
                ].map((step) => (
                  <div key={step.ts} className={`tape-step ${step.last ? 'active' : ''}`}>
                    <p className="font-mono text-[12.5px] tracking-[0.08em] text-accent">{step.ts}</p>
                    <h3 className="mt-[10px] font-display text-[20px] font-semibold leading-tight tracking-[-0.015em]">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[15.5px] leading-relaxed text-ink-secondary">{step.body}</p>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal>
              <p className="mt-12 flex items-center gap-2.5 font-mono text-[13px] text-ink-secondary">
                <span className="h-px w-[22px] bg-accent flex-shrink-0" />
                Total elapsed time:{' '}
                <strong className="font-medium text-ink">five minutes of talking.</strong>
                &nbsp;Total meetings: <strong className="font-medium text-ink">zero.</strong>
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── Outputs ─────────────────────────────────────────── */}
        <section id="outputs" className="border-t border-line px-7 py-24">
          <div className="mx-auto max-w-page">
            <Reveal>
              <div className="mb-16 max-w-[620px]">
                <p className="eyebrow">What you get</p>
                <h2 className="mt-[18px] font-display text-[clamp(30px,3.6vw,42px)] font-semibold leading-[1.08] tracking-[-0.025em]">
                  One recording.{' '}
                  <em className="font-editorial font-medium not-italic italic">Three deliverables.</em>
                </h2>
                <p className="mt-4 text-[18px] text-ink-secondary">
                  Every interview is synthesized into assets your sales, web, and social teams can use
                  the same day.
                </p>
              </div>
            </Reveal>
            <div className="grid gap-5 md:grid-cols-3">
              <Reveal>
                <div className="hover-lift flex h-full min-h-[330px] flex-col rounded-[18px] border border-line bg-white p-[30px]">
                  <p className="font-mono text-[11.5px] uppercase tracking-[0.12em] text-accent">
                    For sales
                  </p>
                  <h3 className="mt-3 font-display text-[22px] font-semibold tracking-[-0.02em]">
                    The PDF case study
                  </h3>
                  <p className="mt-2.5 flex-1 text-[15px] leading-relaxed text-ink-secondary">
                    A designed, metric-led one-pager that reps can attach to the next proposal.
                    Headline number up top, story underneath.
                  </p>
                  <div className="v-pdf mt-6">
                    <div className="bar title" />
                    <div className="bar" style={{ width: '92%' }} />
                    <div className="bar" style={{ width: '84%' }} />
                    <div className="bar" style={{ width: '88%' }} />
                    <div className="bar metric" />
                  </div>
                </div>
              </Reveal>

              <Reveal>
                <div className="hover-lift flex h-full min-h-[330px] flex-col rounded-[18px] border border-line bg-white p-[30px]">
                  <p className="font-mono text-[11.5px] uppercase tracking-[0.12em] text-accent">
                    For the website
                  </p>
                  <h3 className="mt-3 font-display text-[22px] font-semibold tracking-[-0.02em]">
                    The hosted page
                  </h3>
                  <p className="mt-2.5 flex-1 text-[15px] leading-relaxed text-ink-secondary">
                    A clean, shareable web version — because hearing a real voice converts better than
                    reading one.
                  </p>
                  <div className="v-page mt-6">
                    <div className="chrome">
                      <i />
                      <i />
                      <i />
                    </div>
                    <div className="body">
                      <p className="mb-2.5 font-mono text-[10.5px] text-ink-secondary">
                        caseforge.page/northwind
                      </p>
                      <div className="bar h" />
                      <div className="bar" style={{ width: '90%' }} />
                      <div className="bar" style={{ width: '78%' }} />
                    </div>
                  </div>
                </div>
              </Reveal>

              <Reveal>
                <div className="hover-lift flex h-full min-h-[330px] flex-col rounded-[18px] border border-line bg-white p-[30px]">
                  <p className="font-mono text-[11.5px] uppercase tracking-[0.12em] text-accent">
                    For social
                  </p>
                  <h3 className="mt-3 font-display text-[22px] font-semibold tracking-[-0.02em]">
                    The quote cards
                  </h3>
                  <p className="mt-2.5 flex-1 text-[15px] leading-relaxed text-ink-secondary">
                    The sharpest lines, pulled and typeset for LinkedIn — attributed, on-brand, and
                    approved by your client.
                  </p>
                  <div className="v-quote mt-6">
                    <p className="font-editorial italic text-[16px] leading-[1.45]" style={{ color: 'var(--device-text)' }}>
                      &ldquo;We cut onboarding from{' '}
                      <strong className="font-medium text-accent">three weeks to four days.</strong>
                      &rdquo;
                    </p>
                    <p
                      className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.1em]"
                      style={{ color: 'var(--device-dim)' }}
                    >
                      PRIYA N. · VP OPS, NORTHWIND
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Voices ──────────────────────────────────────────── */}
        <section className="border-t border-line px-7 py-24 text-center">
          <div className="mx-auto max-w-page">
            <Reveal>
              <figure>
                <blockquote className="mx-auto max-w-[21em] font-editorial text-[clamp(24px,3.2vw,34px)] font-medium italic leading-[1.35] tracking-[-0.01em]">
                  &ldquo;I asked for one testimonial and got back{' '}
                  <mark className="rounded-sm bg-accent-soft px-[0.12em] text-ink">
                    a case study, a landing page, and a month of LinkedIn posts.
                  </mark>{' '}
                  My client spent six minutes on it.&rdquo;
                </blockquote>
                <figcaption className="mt-[26px] font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink-secondary">
                  Marco T. · Head of Growth, Ferro &amp; Co · Recorded on CaseForge, naturally
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────── */}
        <section className="border-t border-line px-7 pb-[120px] pt-[110px] text-center">
          <div className="mx-auto max-w-page">
            <Reveal>
              <div
                className="mx-auto mb-7 h-[14px] w-[14px] rounded-full bg-accent animate-cta-pulse"
                aria-hidden="true"
              />
              <h2 className="mx-auto max-w-[15em] font-display text-[clamp(30px,3.6vw,42px)] font-semibold leading-[1.08] tracking-[-0.025em]">
                Your best customer is free for{' '}
                <em className="font-editorial font-medium not-italic italic">five minutes</em> today.
              </h2>
              <p className="mt-1.5 text-[18px] text-ink-secondary">
                Draft the questions now. Send the link tonight. Ship the case study this week.
              </p>
              <Link
                href="/signup"
                className="mt-9 inline-flex items-center gap-[10px] rounded-full bg-ink px-[22px] py-[12px] font-sans text-[15px] font-semibold text-paper transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(25,21,16,0.18)]"
              >
                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
                Send your first magic link
              </Link>
              <p className="mt-5 font-mono text-[12.5px] text-ink-secondary">
                First 3 interviews free · No credit card
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-line px-7 py-[34px]">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-[18px]">
          <Link
            href="/"
            className="flex items-center gap-[9px] font-display text-[17px] font-semibold tracking-[-0.02em] text-ink no-underline"
          >
            <span className="h-[9px] w-[9px] flex-shrink-0 rounded-full bg-accent" />
            CaseForge
          </Link>
          <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-secondary">
            © {new Date().getFullYear()} CaseForge · Proof, out loud
          </p>
        </div>
      </footer>
    </div>
  );
}
