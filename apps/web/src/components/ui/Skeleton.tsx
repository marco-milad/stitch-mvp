// Tiny Tailwind pulse skeleton — shape it with utility classes inline.
//   <Skeleton className="h-3 w-24" />     // a line of text
//   <Skeleton className="h-32 rounded-2xl" />  // a card
//
// Uses `animate-pulse` + a slate tint that works in both light and dark
// modes. Don't reach for this when the load is already <100ms — the
// flash-of-skeleton is uglier than the brief blank.

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-slate-100 dark:bg-ink-700 rounded-md ${className}`}
    />
  );
}
