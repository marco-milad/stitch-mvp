import type { ReactNode } from 'react';

/**
 * Mobile-first frame: on small screens, fills the viewport. On larger screens,
 * constrains content to a phone-width column centered on the page so the UI
 * stays usable when viewed on a desktop browser. Keeps us PWA-ready (the same
 * component will render full-bleed inside Capacitor).
 */
export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-ink-100 dark:bg-black flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-ink-50 dark:bg-ink-900 shadow-xl flex flex-col">
        {children}
      </div>
    </div>
  );
}
