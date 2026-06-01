// Mirrors apps/web/src/components/ui/AnimatedCount.tsx — duplicated per
// the no-shared-packages directive. Rolls from previous value to next
// over 600ms with the smooth-easing cubic curve, snaps on
// prefers-reduced-motion.

import { useEffect, useRef, useState } from 'react';

interface AnimatedCountProps {
  value: number;
  durationMs?: number;
  locale?: string;
  className?: string;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function AnimatedCount({
  value,
  durationMs = 600,
  locale = 'en-GB',
  className,
}: AnimatedCountProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }

    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      const current = Math.round(from + (to - from) * eased);
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  return <span className={className}>{new Intl.NumberFormat(locale).format(display)}</span>;
}
