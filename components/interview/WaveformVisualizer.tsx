'use client';

import { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  analyser: AnalyserNode | null;
  active: boolean;
}

/** Animated frequency bars driven by a Web Audio AnalyserNode. */
export function WaveformVisualizer({
  analyser,
  active,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!active || !analyser) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);
    const barCount = 28;
    let frameId: number;

    function draw() {
      if (!analyser || !canvas || !ctx) return;
      analyser.getByteFrequencyData(data);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / barCount;
      const step = Math.floor(data.length / barCount) || 1;

      for (let i = 0; i < barCount; i++) {
        const value = data[i * step] / 255;
        const barHeight = Math.max(4, value * canvas.height);
        const x = i * barWidth + barWidth * 0.2;
        const y = (canvas.height - barHeight) / 2;

        ctx.fillStyle = '#EF3B2D';
        ctx.beginPath();
        // roundRect is unsupported on Safari < 16 — fall back to a plain rect
        // rather than throwing on every animation frame.
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, barWidth * 0.6, barHeight, 3);
        } else {
          ctx.rect(x, y, barWidth * 0.6, barHeight);
        }
        ctx.fill();
      }

      frameId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(frameId);
  }, [analyser, active]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={72}
      className="mx-auto"
      aria-hidden="true"
    />
  );
}
