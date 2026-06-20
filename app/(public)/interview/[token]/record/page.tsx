'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuestionCard } from '@/components/interview/QuestionCard';
import { RecordButton } from '@/components/interview/RecordButton';
import { WaveformVisualizer } from '@/components/interview/WaveformVisualizer';
import { formatDuration } from '@/lib/utils/formatDuration';
import type { Question } from '@/lib/types';

type Phase = 'loading' | 'invalid' | 'idle' | 'recording' | 'reviewing' | 'uploading' | 'transcribed';

const MAX_SECONDS = 180;
const WARN_SECONDS = 150;

export default function RecordPage({ params }: { params: { token: string } }) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [transcript, setTranscript] = useState('');
  const isLastQuestion = index === questions.length - 1;

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const durationRef = useRef(0);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/interview/${params.token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('not found');
        const data = await res.json();
        if (cancelled) return;
        if (!Array.isArray(data.questions) || data.questions.length === 0) throw new Error('no questions');
        setQuestions(data.questions);
        setPhase('idle');
      })
      .catch(() => {
        if (!cancelled) setPhase('invalid');
      });
    return () => { cancelled = true; };
  }, [params.token]);

  const cleanupAudioGraph = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    setAnalyser(null);
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    durationRef.current = Math.round((Date.now() - startTimeRef.current) / 1000);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    recorder.stop();
  }, []);

  const startRecording = useCallback(async () => {
    if (phase !== 'idle') return;
    setError('');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('We need microphone access to record your answer. Please allow it and try again.');
      return;
    }

    streamRef.current = stream;
    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      source.connect(analyserNode);
      audioContextRef.current = audioContext;
      setAnalyser(analyserNode);
    } catch { /* cosmetic — keep recording */ }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined;
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

    chunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      cleanupAudioGraph();
      if (blob.size === 0) { setPhase('idle'); setElapsed(0); return; }
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      setAudioBlob(blob);
      setAudioUrl(url);
      setPhase('reviewing');
    };

    recorderRef.current = recorder;
    recorder.start();
    startTimeRef.current = Date.now();
    setElapsed(0);
    setPhase('recording');

    timerRef.current = setInterval(() => {
      const seconds = (Date.now() - startTimeRef.current) / 1000;
      setElapsed(seconds);
      if (seconds >= MAX_SECONDS) stopRecording();
    }, 200);
  }, [phase, cleanupAudioGraph, stopRecording]);

  function discardTake() {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setAudioUrl(null);
    setAudioBlob(null);
    setElapsed(0);
  }

  function handleReRecord() { discardTake(); setError(''); setPhase('idle'); }

  async function handleSubmit() {
    if (!audioBlob) return;
    setError('');
    setPhase('uploading');

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('questionId', questions[index].id);
    formData.append('duration', String(durationRef.current));

    const res = await fetch(`/api/interview/${params.token}/upload`, { method: 'POST', body: formData });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? 'Upload failed — please try submitting again.');
      setPhase('reviewing');
      return;
    }

    discardTake();
    setTranscript(data.transcript ?? '');
    setPhase('transcribed');
  }

  async function handleContinue() {
    if (index < questions.length - 1) {
      setTranscript('');
      setIndex(index + 1);
      setPhase('idle');
    } else {
      await fetch(`/api/interview/${params.token}/complete`, { method: 'POST' }).catch(() => {});
      router.push(`/interview/${params.token}/done`);
    }
  }

  function handleTranscriptReRecord() {
    setTranscript('');
    setError('');
    setPhase('idle');
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close().catch(() => {});
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  if (phase === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ background: 'var(--device)' }}>
        <div className="flex h-10 items-center gap-1.5" aria-hidden="true">
          {[14, 26, 18, 32, 22].map((h, i) => (
            <span
              key={i}
              className="wave-bar w-1 rounded-full"
              style={{ height: `${h}px`, animationDelay: `${i * 0.14}s`, background: 'rgba(244,241,233,0.4)' }}
            />
          ))}
        </div>
      </main>
    );
  }

  if (phase === 'invalid') {
    return (
      <main className="flex min-h-screen items-center justify-center p-6" style={{ background: 'var(--device)' }}>
        <div className="animate-fade-up max-w-sm text-center" style={{ color: 'var(--device-text)' }}>
          <h1 className="font-display text-[22px] font-semibold">This link isn&apos;t active anymore</h1>
          <p className="mt-2 text-[15px]" style={{ color: 'var(--device-dim)' }}>
            Please contact the person who sent it to you.
          </p>
        </div>
      </main>
    );
  }

  const question = questions[index];
  const showWarning = phase === 'recording' && elapsed >= WARN_SECONDS;

  return (
    <main className="flex min-h-screen flex-col" style={{ background: 'var(--device)' }}>
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--device-line)' }}
      >
        <Link
          href="/"
          className="flex items-center gap-[9px] font-display text-[17px] font-semibold tracking-[-0.02em] no-underline"
          style={{ color: 'var(--device-text)' }}
        >
          <span className="h-[9px] w-[9px] flex-shrink-0 rounded-full bg-accent" />
          CaseForge
        </Link>
        <div className="rec-chip">
          {phase === 'recording' ? (
            <span className="pulse-dot" />
          ) : phase === 'uploading' ? (
            <span className="pulse-dot" />
          ) : (
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: 'var(--device-line)' }} />
          )}
          <span>
            {phase === 'recording' ? 'REC' : phase === 'uploading' ? 'SAVING' : 'READY'}
          </span>
        </div>
      </div>

      {/* Question */}
      <div className="px-6 pt-6">
        <QuestionCard question={question.text} index={index} total={questions.length} />
      </div>

      {/* Recording controls */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8">
        {phase === 'idle' && (
          <p
            className="animate-fade-in max-w-xs text-center font-editorial text-[18px] italic"
            style={{ color: 'var(--device-dim)' }}
          >
            Take a breath. Say it like you&apos;d say it to a colleague.
          </p>
        )}

        {phase === 'recording' && (
          <>
            <WaveformVisualizer analyser={analyser} active />
            <p
              className="font-mono text-3xl font-semibold tabular-nums"
              style={{ color: 'var(--device-text)' }}
            >
              {formatDuration(elapsed)}
            </p>
            {showWarning && (
              <p className="animate-fade-in font-mono text-[12px] uppercase tracking-[0.14em] text-accent">
                30 seconds left — recording stops at 3:00
              </p>
            )}
          </>
        )}

        {phase === 'reviewing' && audioUrl && (
          <div className="animate-fade-up flex w-full max-w-md flex-col items-center gap-6">
            <p className="font-editorial text-[18px] italic" style={{ color: 'var(--device-dim)' }}>
              Have a listen — happy with it?
            </p>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio src={audioUrl} controls className="w-full" />
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                size="xl"
                className="flex-1 border-white/20 bg-transparent text-white hover:border-white/40 hover:bg-white/10 hover:text-white"
                onClick={handleReRecord}
              >
                <RotateCcw className="h-4 w-4" />
                Re-record
              </Button>
              <Button
                size="xl"
                className="flex-1 bg-white text-ink hover:bg-paper"
                onClick={handleSubmit}
              >
                Review answer →
              </Button>
            </div>
          </div>
        )}

        {phase === 'transcribed' && (
          <div className="animate-fade-up flex w-full max-w-md flex-col gap-4">
            <p className="font-editorial text-[18px] italic" style={{ color: 'var(--device-dim)' }}>
              Here&apos;s what we heard:
            </p>
            <div
              className="rounded-[14px] p-4 text-[14px] leading-relaxed"
              style={{ background: 'rgba(244,241,233,0.08)', color: 'var(--device-text)' }}
            >
              {transcript || <em style={{ color: 'var(--device-dim)' }}>No transcript available.</em>}
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                size="xl"
                className="flex-1 border-white/20 bg-transparent text-white hover:border-white/40 hover:bg-white/10 hover:text-white"
                onClick={handleTranscriptReRecord}
              >
                <RotateCcw className="h-4 w-4" />
                Re-record
              </Button>
              <Button
                size="xl"
                className="flex-1 bg-white text-ink hover:bg-paper"
                onClick={handleContinue}
              >
                {isLastQuestion ? 'Submit →' : 'Next question →'}
              </Button>
            </div>
          </div>
        )}

        {phase === 'uploading' && (
          <div className="animate-fade-in flex flex-col items-center gap-5">
            <div className="flex h-10 items-center gap-1.5" aria-hidden="true">
              {[14, 26, 18, 32, 22].map((h, i) => (
                <span
                  key={i}
                  className="wave-bar w-1 rounded-full bg-accent"
                  style={{ height: `${h}px`, animationDelay: `${i * 0.14}s` }}
                />
              ))}
            </div>
            <p className="font-mono text-[12px] uppercase tracking-[0.14em]" style={{ color: 'var(--device-dim)' }}>
              Saving your answer…
            </p>
          </div>
        )}

        {error && <p className="max-w-sm text-center text-[14px] text-accent">{error}</p>}
      </div>

      {/* Record button */}
      <div className="flex justify-center pb-8 pt-4">
        {(phase === 'idle' || phase === 'recording') && (
          <RecordButton
            recording={phase === 'recording'}
            onPressStart={startRecording}
            onPressEnd={stopRecording}
          />
        )}
      </div>
    </main>
  );
}
