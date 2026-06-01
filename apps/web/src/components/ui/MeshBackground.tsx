// Conic + radial mesh wash. Three blurred blobs drift on independent
// 18s/22s/26s loops so the overall palette never visibly repeats inside
// a session. Sits at -z-10 so glass cards have something to blur over.
//
// Tunable via `tone`: 'pastel' (default — sky/violet/pink, used on Home
// + Tabs surfaces), 'warm' (amber/rose, used on Voice/idle Farah).
//
// Reduced-motion users see the static composition — drift stops, hues
// stay (the index.css guard kills the animation classes).

interface MeshBackgroundProps {
  tone?: 'pastel' | 'warm';
  /** When true, the wash is dimmed so foreground text stays legible. */
  dim?: boolean;
}

const PALETTES = {
  pastel: {
    a: '#7DD3FC', // sky-300
    b: '#C4B5FD', // violet-300
    c: '#FBCFE8', // pink-200
  },
  warm: {
    a: '#FCD34D', // amber-300
    b: '#FDA4AF', // rose-300
    c: '#C4B5FD', // violet-300
  },
} as const;

export function MeshBackground({ tone = 'pastel', dim = false }: MeshBackgroundProps) {
  const p = PALETTES[tone];
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden bg-white dark:bg-ink-900"
      style={{ opacity: dim ? 0.55 : 1 }}
    >
      {/* Blob A — top-left */}
      <div
        className="absolute -top-1/4 -left-1/4 w-[70vmax] h-[70vmax] rounded-full blur-3xl opacity-60 motion-safe:animate-mesh-a"
        style={{ backgroundColor: p.a }}
      />
      {/* Blob B — bottom-right */}
      <div
        className="absolute -bottom-1/4 -right-1/4 w-[65vmax] h-[65vmax] rounded-full blur-3xl opacity-50 motion-safe:animate-mesh-b"
        style={{ backgroundColor: p.b }}
      />
      {/* Blob C — centre, larger, slowest */}
      <div
        className="absolute top-1/4 left-1/4 w-[80vmax] h-[80vmax] rounded-full blur-3xl opacity-40 motion-safe:animate-mesh-c"
        style={{ backgroundColor: p.c }}
      />
      {/* Soft white overlay keeps text readable against the saturated blobs. */}
      <div className="absolute inset-0 bg-white/30 dark:bg-ink-900/30" />
    </div>
  );
}
