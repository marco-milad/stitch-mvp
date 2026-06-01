// Stroke-draw checkmark — the executive-luxury "resolved" beat. The
// SVG path renders with strokeDasharray=40 and strokeDashoffset
// animates from 40 → 0 via the `check-draw` keyframe (520ms, smooth
// easing). Wrap in a circle for the badge form.

interface DrawCheckProps {
  size?: number;
  /** Stroke colour. Default emerald-600. */
  color?: string;
  /** When true, the surrounding ring fades in with a subtle glow. */
  withRing?: boolean;
}

export function DrawCheck({ size = 18, color = '#059669', withRing = false }: DrawCheckProps) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center',
        withRing
          ? 'rounded-full bg-emerald-100/70 backdrop-blur-sm ring-1 ring-emerald-300/60 shadow-[0_0_14px_rgba(16,185,129,0.4)]'
          : '',
      ].join(' ')}
      style={withRing ? { width: size + 12, height: size + 12 } : undefined}
      aria-hidden
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12.5L10 17.5L19 7"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={40}
          strokeDashoffset={40}
          className="animate-check-draw"
        />
      </svg>
    </span>
  );
}
