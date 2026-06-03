// Profile completion — was a 2px bar, now a 64px SVG progress ring with
// the user's Clerk avatar (or initial) at the centre. Stroke is a brand
// → accent linear gradient. On 100% the ring briefly amplifies (spring
// easing) so the milestone reads as a celebration, not a quiet flip.
//
// `percent`, `doneCount`, `totalCount` keep the same prop shape so the
// caller in Profile.tsx doesn't change.

import { useUser } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';

import { AnimatedCount } from '@/components/ui/AnimatedCount';

interface Props {
  percent: number;
  doneCount: number;
  totalCount: number;
}

const SIZE = 72;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

export function CompletionBar({ percent, doneCount, totalCount }: Props) {
  const { user } = useUser();
  const [animatedPct, setAnimatedPct] = useState(0);

  // Animate the ring once on mount + whenever percent changes. Sets
  // dashoffset via inline style so the SVG attr respects updates.
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimatedPct(percent));
    return () => cancelAnimationFrame(id);
  }, [percent]);

  const offset = CIRC * (1 - animatedPct / 100);
  const complete = percent >= 100;
  const initials =
    (user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '') || user?.username?.[0] || 'U';

  return (
    <div className="mx-4 my-3 p-4 bg-white dark:bg-ink-700 rounded-3xl border border-sand-200/60 dark:border-ink-700 shadow-sm flex flex-row items-center gap-4">
      {/* Radial — Rule 5 (single accent): stroke gradient swaps from
          brand→violet to ink-950→accent-500 so the ring belongs to the
          brand vocabulary. */}
      <div
        className={`relative flex-shrink-0 ${complete ? 'motion-safe:animate-orb-breathe' : ''}`}
        style={{ width: SIZE, height: SIZE }}
      >
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <defs>
            <linearGradient id="completion-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0A0B0D" />
              <stop offset="100%" stopColor="#E8C760" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="#E8DEC9"
            strokeWidth={STROKE}
            fill="transparent"
          />
          {/* Progress */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="url(#completion-grad)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.32, 0.72, 0, 1)' }}
          />
        </svg>
        {/* Avatar / initials in centre — sacred ink-950 fallback per Rule 3 */}
        <div className="absolute inset-0 flex items-center justify-center">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={user.fullName ?? 'You'}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-ink-950 text-white text-body-md font-bold flex items-center justify-center ring-2 ring-white shadow-sm">
              {initials.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Label + counts (animated) */}
      <div className="flex-1 min-w-0">
        <p className="text-body-md font-bold text-ink-950 dark:text-white">Profile completion</p>
        <p className="text-label-sm normal-case tracking-normal font-normal text-ink-500 dark:text-ink-100 mt-0.5">
          <AnimatedCount
            value={doneCount}
            className="tabular-nums font-bold text-ink-950 dark:text-white"
          />{' '}
          of <span className="tabular-nums">{totalCount}</span> ·{' '}
          <AnimatedCount
            value={percent}
            className="tabular-nums font-bold text-ink-950 dark:text-white"
          />
          %
        </p>
        {complete && (
          <p className="text-label-sm normal-case tracking-normal font-bold text-status-success mt-1">
            Complete — nicely done.
          </p>
        )}
      </div>
    </div>
  );
}
