import type { CSSProperties, ReactNode } from 'react';

interface Props {
  from: string;
  to: string;
  /** Angle in degrees (135 = top-left to bottom-right, mirrors mobile default). */
  angle?: number;
  style?: CSSProperties;
  children?: ReactNode;
  /** Border radius applied to the wrapping element. */
  radius?: number;
  className?: string;
}

/**
 * CSS linear-gradient wrapper. Replaces the mobile SVG-based Gradient with
 * a native browser implementation — same prop API for drop-in usage.
 */
export function Gradient({ from, to, angle = 135, style, children, radius = 0, className }: Props) {
  return (
    <div
      className={className}
      style={{
        background: `linear-gradient(${angle}deg, ${from}, ${to})`,
        borderRadius: radius,
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
