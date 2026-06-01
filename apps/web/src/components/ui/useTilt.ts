// 3-D tilt-on-hover hook. Returns an `onMouseMove` + `onMouseLeave` pair
// that drive two CSS custom properties (--tx, --ty) on the target
// element. Compose with the `.tilt-surface` utility from index.css for
// the actual transform, and `.tilt-sheen` for the cursor-tracking
// specular highlight.
//
// Skipped silently on touch devices (no hover = nothing to tilt). Also
// neutralised by the prefers-reduced-motion guard.

import { useRef, type CSSProperties, type RefObject } from 'react';

// Generic over the actual element type — buttons need HTMLButtonElement,
// divs HTMLDivElement, etc. Defaults to HTMLElement so callers can hold
// `useTilt()` without parameterising for the common div case.
interface TiltHandlers<T extends HTMLElement> {
  ref: RefObject<T | null>;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  /** Initial style hint — keeps SSR-safe defaults until first hover. */
  style: CSSProperties;
}

export function useTilt<T extends HTMLElement = HTMLDivElement>(): TiltHandlers<T> {
  const ref = useRef<T | null>(null);
  return {
    ref,
    onMouseMove: (e) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const tx = (e.clientX - rect.left) / rect.width;
      const ty = (e.clientY - rect.top) / rect.height;
      el.style.setProperty('--tx', String(tx));
      el.style.setProperty('--ty', String(ty));
    },
    onMouseLeave: () => {
      const el = ref.current;
      if (!el) return;
      el.style.setProperty('--tx', '0.5');
      el.style.setProperty('--ty', '0.5');
    },
    style: { ['--tx' as string]: '0.5', ['--ty' as string]: '0.5' },
  };
}
