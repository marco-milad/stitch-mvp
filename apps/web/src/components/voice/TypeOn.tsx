// Character-by-character typing for Farah's reply bubbles. Single
// chunk: takes the full text, reveals at ~30ms/char with a blinking
// cursor at the cutoff. When the source text changes, it resets.
//
// Reduced-motion users see the full text immediately (the cursor still
// blinks until they tap away — that's purely decorative).

import { useEffect, useState } from 'react';

interface Props {
  text: string;
  /** ms per character. Default 28 (≈ a fast typist). */
  charDelayMs?: number;
  /** Optional className applied to the container span. */
  className?: string;
  /** When true, the blinking cursor stays after typing finishes. */
  trailingCursor?: boolean;
}

export function TypeOn({ text, charDelayMs = 28, className, trailingCursor = false }: Props) {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const [visible, setVisible] = useState(prefersReducedMotion ? text : '');

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisible(text);
      return;
    }
    setVisible('');
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setVisible(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, charDelayMs);
    return () => window.clearInterval(id);
  }, [text, charDelayMs, prefersReducedMotion]);

  const done = visible.length >= text.length;
  return (
    <span className={className}>
      {visible}
      {(!done || trailingCursor) && (
        <span
          aria-hidden
          className="inline-block w-[1px] h-[1em] align-text-bottom ms-0.5 bg-current motion-safe:animate-caret-blink"
        />
      )}
    </span>
  );
}
