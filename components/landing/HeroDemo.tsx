'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, FileText, Globe, Mic, Quote } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * The signature interaction: a ~16s auto-playing loop that tells the whole
 * product story — a question is asked, a client answers out loud, the words
 * become a transcript, the transcript becomes a case study.
 */

type Phase = 'question' | 'recording' | 'transcribing' | 'drafting' | 'payoff';

const QUESTION =
  'What measurable result did you see after the new email flows went live?';

const TRANSCRIPT =
  '“Within the first month, repeat-purchase revenue was up about 40% — we’d never seen numbers like that before.”';

const PHASE_LABEL: Record<Phase, string> = {
  question: 'INTERVIEW',
  recording: 'REC',
  transcribing: 'TRANSCRIBING',
  drafting: 'WRITING',
  payoff: 'READY',
};

// Phase durations in ms — the whole loop reads like a short film
const TIMINGS: Record<Phase, number> = {
  question: 2200,
  recording: 4600,
  transcribing: 4200,
  drafting: 1800,
  payoff: 4800,
};

const WAVE_HEIGHTS = [10, 22, 34, 26, 40, 30, 18, 36, 24, 14, 28, 38, 20, 12];

export function HeroDemo() {
  const [phase, setPhase] = useState<Phase>('question');
  const [typed, setTyped] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [metric, setMetric] = useState(0);
  const [reduced, setReduced] = useState(false);
  const cycleRef = useRef(0);

  // Respect reduced motion: skip straight to the finished case study
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setReduced(true);
      setPhase('payoff');
      setTyped(TRANSCRIPT);
      setMetric(40);
    }
  }, []);

  // Phase loop
  useEffect(() => {
    if (reduced) return;
    const timeout = setTimeout(() => {
      setPhase((current) => {
        const order: Phase[] = [
          'question',
          'recording',
          'transcribing',
          'drafting',
          'payoff',
        ];
        const next = order[(order.indexOf(current) + 1) % order.length];
        if (next === 'question') {
          cycleRef.current += 1;
          setTyped('');
          setSeconds(0);
          setMetric(0);
        }
        return next;
      });
    }, TIMINGS[phase]);
    return () => clearTimeout(timeout);
  }, [phase, reduced]);

  // Recording timer
  useEffect(() => {
    if (reduced || phase !== 'recording') return;
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 380);
    return () => clearInterval(interval);
  }, [phase, reduced]);

  // Typing simulation
  useEffect(() => {
    if (reduced || phase !== 'transcribing') return;
    let i = 0;
    const interval = setInterval(() => {
      i += 3;
      setTyped(TRANSCRIPT.slice(0, i));
      if (i >= TRANSCRIPT.length) clearInterval(interval);
    }, 28);
    return () => clearInterval(interval);
  }, [phase, reduced]);

  // Metric count-up on payoff
  useEffect(() => {
    if (reduced || phase !== 'payoff') return;
    let frame: number;
    const start = performance.now();
    const duration = 900;
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setMetric(Math.round(eased * 40));
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, reduced]);

  const isResult = phase === 'payoff';

  return (
    <div className="w-full max-w-md rounded-[20px] border border-line bg-surface shadow-[0_1px_2px_rgb(25_21_16/0.03),0_24px_60px_-28px_rgb(25_21_16/0.18)]">
      {/* Header strip */}
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          acme cosmetics · interview
        </span>
        <span
          className={cn(
            'flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em]',
            phase === 'recording' ? 'text-accent' : 'text-ink-muted',
            isResult && 'text-[#2E8B61]'
          )}
        >
          {phase === 'recording' && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ring absolute h-full w-full rounded-full bg-accent" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
          )}
          {isResult && <Check className="h-3 w-3" />}
          {PHASE_LABEL[phase]}
        </span>
      </div>

      {/* Body */}
      <div className="relative min-h-[380px] px-6 py-6 sm:px-7">
        {!isResult ? (
          <div key={`interview-${cycleRef.current}`} className="animate-fade-in">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
              Question 1 of 3
            </p>
            <p className="mt-3 font-display text-lg font-semibold leading-snug tracking-tight text-ink">
              {QUESTION}
            </p>

            {/* Recording */}
            <div className="mt-7">
              {phase === 'question' && (
                <div className="flex flex-col items-center gap-3 py-6 text-ink-muted">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-subtle">
                    <Mic className="h-5 w-5 text-ink-secondary" />
                  </span>
                  <p className="text-sm">Waiting for answer…</p>
                </div>
              )}

              {phase === 'recording' && (
                <div className="animate-fade-in flex flex-col items-center gap-4 py-4">
                  <div className="flex h-12 items-center gap-1">
                    {WAVE_HEIGHTS.map((h, i) => (
                      <span
                        key={i}
                        className="wave-bar w-1 rounded-full bg-accent"
                        style={{
                          height: `${h}px`,
                          animationDelay: `${i * 0.09}s`,
                        }}
                      />
                    ))}
                  </div>
                  <p className="font-mono text-sm text-ink-secondary">
                    0:{String(seconds).padStart(2, '0')} · speaking
                  </p>
                </div>
              )}

              {(phase === 'transcribing' || phase === 'drafting') && (
                <div className="animate-fade-in">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                    Transcript
                  </p>
                  <p
                    className={cn(
                      'mt-2 min-h-[96px] font-editorial text-[17px] italic leading-relaxed text-ink-secondary',
                      phase === 'transcribing' && 'typing-caret'
                    )}
                  >
                    {typed}
                  </p>

                  {phase === 'drafting' && (
                    <div className="mt-5">
                      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                        Writing case study…
                      </p>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-subtle">
                        <div
                          className="animate-fill-x h-full rounded-full bg-ink"
                          style={{ animationDuration: '1.6s' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Payoff: the finished case study */
          <div className="animate-scale-in">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
              Case study
            </p>
            <p className="mt-3 font-display text-xl font-semibold leading-snug tracking-tight text-ink">
              How Acme grew repeat revenue with three email flows
            </p>

            <div className="mt-5 flex items-end gap-3 border-b border-line pb-5">
              <span className="font-display text-5xl font-semibold tracking-tight text-ink">
                +{metric}%
              </span>
              <span className="pb-1.5 text-sm leading-snug text-ink-secondary">
                repeat-purchase
                <br />
                revenue, month one
              </span>
            </div>

            <p className="mt-5 font-editorial text-[17px] italic leading-relaxed text-ink-secondary">
              “We’d never seen numbers like that before.”
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {[
                { icon: FileText, label: 'PDF ready' },
                { icon: Globe, label: 'Page live' },
                { icon: Quote, label: '3 quotes' },
              ].map(({ icon: Icon, label }, i) => (
                <span
                  key={label}
                  className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-line bg-subtle px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-secondary"
                  style={{ animationDelay: `${500 + i * 160}ms` }}
                >
                  <Icon className="h-3 w-3 text-[#2E8B61]" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer: loop progress dots */}
      <div className="flex items-center justify-between border-t border-line px-5 py-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          voice → case study
        </span>
        <div className="flex gap-1.5">
          {(
            ['question', 'recording', 'transcribing', 'drafting', 'payoff'] as Phase[]
          ).map((p) => (
            <span
              key={p}
              className={cn(
                'h-1.5 w-1.5 rounded-full transition-colors duration-300',
                p === phase ? 'bg-ink' : 'bg-line'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
