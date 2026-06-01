// Cascade-delay helper — compose with the `animate-rise-in` keyframe to
// make list items appear in sequence. Cap at ~10 items so a very long
// list doesn't take 1.2s to reveal.

import type { CSSProperties } from 'react';

const PER_ITEM_MS = 50;
const MAX_DELAY_MS = 500;

export function staggerStyle(index: number): CSSProperties {
  const delay = Math.min(index * PER_ITEM_MS, MAX_DELAY_MS);
  return { animationDelay: `${delay}ms` };
}
