'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';

const QUOTE =
  'We cut onboarding from three weeks to four days, and the team actually noticed. Honestly? I recorded this from the back of a cab between meetings.';
const DURATION_DISPLAY = 38;
const PLAY_MS = 14000;
const BAR_COUNT = 64;

const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const t = i / BAR_COUNT;
  const h =
    22 +
    60 *
      Math.abs(Math.sin(t * 9.1) * 0.6 + Math.sin(t * 23.7) * 0.4) *
      (0.55 + 0.45 * Math.sin(t * 3.1 + 1));
  return Math.max(12, Math.min(96, h));
});

function fmt(s: number) {
  const secs = Math.floor(s);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

export function HeroDemo() {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const [attrShow, setAttrShow] = useState(false);
  const [chipsIn, setChipsIn] = useState([false, false, false]);

  const playingRef = useRef(false);
  const rafRef = useRef(0);
  const startTRef = useRef(0);
  const startProgressRef = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setProgress(1);
      setDone(true);
      setAttrShow(true);
      setChipsIn([true, true, true]);
      return;
    }
    const t = setTimeout(() => setPlaying(true), 700);
    return () => clearTimeout(t);
  }, []);

  const handleFinish = () => {
    playingRef.current = false;
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    setDone(true);
    setAttrShow(true);
    [0, 1, 2].forEach((i) =>
      setTimeout(
        () => setChipsIn((prev) => { const n = [...prev]; n[i] = true; return n; }),
        250 + i * 220
      )
    );
  };

  useEffect(() => {
    if (playing) {
      playingRef.current = true;
      startTRef.current = 0;
      startProgressRef.current = progress;

      const tick = (now: number) => {
        if (!playingRef.current) return;
        if (startTRef.current === 0) startTRef.current = now;
        const elapsed = now - startTRef.current;
        const next = Math.min(startProgressRef.current + elapsed / PLAY_MS, 1);
        setProgress(next);
        if (next >= 1) {
          handleFinish();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } else {
      playingRef.current = false;
      cancelAnimationFrame(rafRef.current);
    }

    return () => {
      playingRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  const playedBars = Math.floor(progress * BAR_COUNT);
  const typedText = QUOTE.slice(0, Math.floor(progress * QUOTE.length));

  const handlePlayPause = () => {
    if (done) return;
    startProgressRef.current = progress;
    setPlaying((p) => !p);
  };

  return (
    <div
      className="player w-full max-w-[460px]"
      aria-label="Demo of a CaseForge interview being recorded and transcribed"
    >
      {/* Header */}
      <div className="player-head">
        <div>
          <p className="text-[14px] font-semibold leading-tight" style={{ color: 'var(--device-text)' }}>
            Priya N. — VP Operations, Northwind
          </p>
          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--device-dim)' }}>
            Interview · recorded from her phone
          </p>
        </div>
        <div className={cn('rec-chip', done && 'text-success')}>
          {done ? (
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-success" />
          ) : (
            <span className="pulse-dot" />
          )}
          <span>{done ? 'SAVED' : 'REC'}</span>
        </div>
      </div>

      {/* Question */}
      <p className="mt-4 font-mono text-[12px] tracking-[0.05em]" style={{ color: 'var(--device-dim)' }}>
        Q3 / 06 —{' '}
        <span style={{ color: 'var(--device-text)' }} className="font-medium">
          &ldquo;What changed after you switched?&rdquo;
        </span>
      </p>

      {/* Waveform + play button */}
      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={handlePlayPause}
          aria-label={playing ? 'Pause demo' : 'Play demo'}
          className="flex h-[46px] w-[46px] flex-shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors"
          style={{
            borderColor: 'var(--device-line)',
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--device-text)',
          }}
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="2.5" y="2" width="3.6" height="12" rx="1" />
              <rect x="9.9" y="2" width="3.6" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2.3c0-.9 1-1.5 1.8-1L13.4 7c.8.5.8 1.6 0 2.1L5.8 13.7c-.8.5-1.8-.1-1.8-1V2.3z" />
            </svg>
          )}
        </button>

        <div className="flex h-[58px] flex-1 items-center gap-[2.5px]" aria-hidden="true">
          {BAR_HEIGHTS.map((h, i) => (
            <span
              key={i}
              className="min-w-[2px] flex-1 rounded-sm transition-colors duration-150"
              style={{
                height: `${h}%`,
                background: i < playedBars ? '#EF3B2D' : 'var(--device-line)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Time row */}
      <div
        className="mt-2.5 flex justify-between font-mono text-[11.5px]"
        style={{ color: 'var(--device-dim)' }}
      >
        <span>{fmt(progress * DURATION_DISPLAY)}</span>
        <span>0:38</span>
      </div>

      {/* Transcript */}
      <div
        className="mt-4 min-h-[118px] font-editorial italic leading-relaxed"
        style={{ fontSize: '20px', letterSpacing: '0.005em', color: 'var(--device-text)' }}
        aria-live="off"
      >
        &ldquo;
        {typedText}
        {!done && (
          <span
            className="ml-[2px] inline-block w-[2px] bg-accent align-[-2px]"
            style={{ height: '1em', animation: 'caret-blink 1s step-end infinite' }}
          />
        )}
        {done && <>&rdquo;</>}
        <span
          className="mt-3 block font-mono not-italic text-[11.5px] tracking-[0.1em] transition-opacity duration-700"
          style={{ color: 'var(--device-dim)', opacity: attrShow ? 1 : 0 }}
        >
          TRANSCRIBED &amp; CLEANED BY CASEFORGE · 0:38
        </span>
      </div>

      {/* Asset chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        {['northwind-case-study.pdf', 'caseforge.page/northwind', '12 quote cards'].map(
          (label, i) => (
            <span
              key={label}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11.5px]',
                chipsIn[i] ? 'animate-chip-in' : 'opacity-0'
              )}
              style={{ borderColor: 'var(--device-line)', color: 'var(--device-text)' }}
            >
              <span className="font-medium text-success">✓</span>
              {label}
            </span>
          )
        )}
      </div>
    </div>
  );
}
