'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuestionCard } from '@/components/interview/QuestionCard';
import { RecordButton } from '@/components/interview/RecordButton';
import { WaveformVisualizer } from '@/components/interview/WaveformVisualizer';
import { formatDuration } from '@/lib/utils/formatDuration';
import type { Question } from '@/lib/types';

type Phase =
  | 'loading'
  | 'invalid'
  | 'idle'
  | 'recording'
  | 'reviewing'
  | 'uploading';

const MAX_SECONDS = 180; // auto-stop at 3:00
const WARN_SECONDS = 150; // warning at 2:30

export default function RecordPage({
  params,
}: {
  params: { token: string };
}) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const durationRef = useRef(0);

  // Load the campaign's questions
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/interview/${params.token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('not found');
        const data = await res.json();
        if (cancelled) return;
        if (!Array.isArray(data.questions) || data.questions.length === 0) {
          throw new Error('no questions');
        }
        setQuestions(data.questions);
        setPhase('idle');
      })
      .catch(() => {
        if (!cancelled) setPhase('invalid');
      });
    return () => {
      cancelled = true;
    };
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
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recorder.stop();
  }, []);

  const startRecording = useCallback(async () => {
    if (phase !== 'idle') return;
    setError('');

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(
        'We need microphone access to record your answer. Please allow it and try again.'
      );
      return;
    }

    streamRef.current = stream;

    // Waveform: feed the mic into an AnalyserNode
    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      source.connect(analyserNode);
      audioContextRef.current = audioContext;
      setAnalyser(analyserNode);
    } catch {
      // Visualizer is cosmetic — keep recording even if Web Audio fails
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : undefined;
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || 'audio/webm',
      });
      cleanupAudioGraph();
      if (blob.size === 0) {
        setPhase('idle');
        setElapsed(0);
        return;
      }
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
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
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setElapsed(0);
  }

  function handleReRecord() {
    discardTake();
    setError('');
    setPhase('idle');
  }

  async function handleSubmit() {
    if (!audioBlob) return;
    setError('');
    setPhase('uploading');

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('questionId', questions[index].id);
    formData.append('duration', String(durationRef.current));

    const res = await fetch(`/api/interview/${params.token}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Upload failed — please try submitting again.');
      setPhase('reviewing');
      return;
    }

    // uploaded — auto-advance
    discardTake();
    if (index < questions.length - 1) {
      setIndex(index + 1);
      setPhase('idle');
    } else {
      await fetch(`/api/interview/${params.token}/complete`, {
        method: 'POST',
      }).catch(() => {});
      router.push(`/interview/${params.token}/done`);
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close().catch(() => {});
    };
  }, []);

  if (phase === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </main>
    );
  }

  if (phase === 'invalid') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900 p-6">
        <div className="max-w-sm text-center">
          <p className="text-4xl">🔗</p>
          <h1 className="mt-4 text-xl font-semibold text-white">
            This link isn&apos;t active anymore
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Please contact the person who sent it to you.
          </p>
        </div>
      </main>
    );
  }

  const question = questions[index];
  const showWarning = phase === 'recording' && elapsed >= WARN_SECONDS;

  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-slate-900 px-6 py-10">
      <QuestionCard
        question={question.text}
        index={index}
        total={questions.length}
      />

      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 py-8">
        {phase === 'recording' && (
          <>
            <WaveformVisualizer analyser={analyser} active />
            <p className="font-mono text-3xl font-semibold text-white">
              {formatDuration(elapsed)}
            </p>
            {showWarning && (
              <p className="text-sm font-medium text-amber-400">
                ⏰ 30 seconds left — recording stops at 3:00
              </p>
            )}
          </>
        )}

        {phase === 'reviewing' && audioUrl && (
          <div className="flex w-full flex-col items-center gap-6">
            <p className="text-sm text-slate-400">
              Have a listen — happy with it?
            </p>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio src={audioUrl} controls className="w-full" />
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 border-slate-600 bg-transparent text-white hover:bg-slate-800 hover:text-white"
                onClick={handleReRecord}
              >
                <RotateCcw className="h-4 w-4" />
                Re-record
              </Button>
              <Button size="lg" className="flex-1" onClick={handleSubmit}>
                Submit Answer →
              </Button>
            </div>
          </div>
        )}

        {phase === 'uploading' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
            <p className="text-sm text-slate-300">Uploading your answer…</p>
          </div>
        )}

        {error && (
          <p className="max-w-sm text-center text-sm text-red-400">{error}</p>
        )}
      </div>

      <div className="pb-4">
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
