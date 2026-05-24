import { useEffect, useRef, useState } from 'react';

import type { VoiceState } from '@/lib/schemas/voice';
import { getCurrentMicLevel } from '@/stores/voiceStore';

interface Props {
  state: VoiceState;
}

const BAR_COUNT = 16;

// Static per-bar shape — gives the bar group a natural waveform silhouette
// (taller in the middle, shorter at the edges) instead of a flat line.
const BAR_SHAPE: ReadonlyArray<number> = [
  0.42, 0.58, 0.72, 0.84, 0.94, 1.0, 0.96, 0.88, 0.88, 0.96, 1.0, 0.94, 0.84, 0.72, 0.58, 0.42,
];

// Empty heights for the "idle bar floor" while no signal is registering —
// shows the user the mic exists without faking activity.
const FLOOR: ReadonlyArray<number> = BAR_SHAPE.map((s) => 4 + s * 4);

/**
 * Real-mic-RMS-driven waveform. Reads `getCurrentMicLevel()` on every
 * animation frame, applies a perceptual sqrt curve (quiet speech registers
 * visibly), multiplies by a static per-bar shape so the bars read as a
 * waveform, then nudges with a tiny per-bar jitter for liveliness.
 */
export function AudioVisualizer({ state }: Props) {
  const [heights, setHeights] = useState<number[]>(() => [...FLOOR]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (state !== 'listening' && state !== 'responding') {
      setHeights([...FLOOR]);
      return;
    }
    const tick = () => {
      const level = getCurrentMicLevel();
      // sqrt scales typical speech RMS (~0.05–0.2) into a visible 0.22–0.45
      // range. Boost by 3.2× so even soft speech fills most of the bar height.
      const amp = Math.min(1, Math.sqrt(level) * 3.2);
      const next = BAR_SHAPE.map((shape, i) => {
        const jitter = 0.85 + 0.3 * Math.random();
        const value = amp * shape * jitter * 100;
        return Math.max(FLOOR[i] ?? 4, Math.min(100, value));
      });
      setHeights(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [state]);

  if (state === 'idle') return null;

  if (state === 'processing') {
    return (
      <div className="h-10 flex items-center justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-brand-500 animate-bounce"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    );
  }

  // listening = red (user-side); responding = brand cyan (Farah is talking,
  // user can still interrupt — bars react to their own mic in real time).
  const barColor = state === 'responding' ? 'bg-brand-500' : 'bg-red-500';

  return (
    <div className="h-10 flex items-center justify-center gap-1">
      {heights.map((h, i) => (
        <span
          key={i}
          className={`w-1 rounded-full transition-[height] duration-75 ${barColor}`}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}
