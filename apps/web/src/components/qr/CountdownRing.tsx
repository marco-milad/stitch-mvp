import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  /** Total countdown duration in ms. */
  durationMs: number;
  /** Outer ring size in px. */
  size: number;
  /** Stroke thickness. */
  thickness?: number;
  /** Called every time the countdown reaches zero (signal to refresh QR). */
  onTick?: () => void;
  children: ReactNode;
}

export function CountdownRing({ durationMs, size, thickness = 4, onTick, children }: Props) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const circleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    let raf = 0;
    let start = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - start) % durationMs;
      const progress = elapsed / durationMs;
      if (circleRef.current) {
        circleRef.current.style.strokeDashoffset = String(circumference * (1 - progress));
      }
      // Detect wrap-around — fire onTick when crossing the boundary.
      if (now - start >= durationMs) {
        start = now;
        if (onTick) onTick();
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, onTick, circumference]);

  return (
    <div
      style={{ width: size, height: size }}
      className="relative flex items-center justify-center"
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={thickness}
          fill="transparent"
        />
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#06B6D4"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={0}
          fill="transparent"
        />
      </svg>
      {children}
    </div>
  );
}
