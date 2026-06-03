import { Bell, User } from 'lucide-react';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useNavigateWithTransition } from '@/lib/viewTransition';

interface TopBarProps {
  title: string;
  /** When provided and > 0, shows a small unread indicator on the bell icon. */
  unreadCount?: number;
}

export function TopBar({ title, unreadCount }: TopBarProps) {
  // `useNavigateWithTransition` wraps the route change in
  // `document.startViewTransition` on Chromium/Safari so the swap to
  // /profile or /notifications crossfades over 240ms; Firefox falls
  // through to a normal navigate. Drop-in replacement for `useNavigate`.
  const navigate = useNavigateWithTransition();
  // Brand identity: TopBar reads as part of the warm sand-50 page surface
  // rather than a glassy panel. No border line — only a hairline of
  // sand-200 to anchor the chrome. All icon tints land on the ink scale
  // so the bar feels neutral and lets per-screen accents do the talking.
  return (
    <div className="flex flex-row items-center justify-between px-4 pt-3 pb-3 bg-sand-50/95 dark:bg-ink-900/95 backdrop-blur-md border-b border-sand-200/60 dark:border-ink-700">
      <span className="text-display-md text-ink-950 dark:text-white truncate">{title}</span>

      <div className="flex flex-row items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          aria-label="Notifications"
          className="relative w-10 h-10 flex items-center justify-center rounded-full text-ink-700 dark:text-white hover:bg-sand-100 dark:hover:bg-ink-700 hover:scale-105 active:scale-95 transition-all duration-fast ease-smooth"
        >
          <Bell color="currentColor" size={22} />
          {unreadCount !== undefined && unreadCount > 0 && (
            // Notifications unread dot is the ONE accent on the global chrome —
            // accent-500 (luxe gold), not brand-cyan. Restrained per Rule 5.
            <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-accent-500 ring-2 ring-sand-50 dark:ring-ink-900" />
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate('/profile')}
          aria-label="Profile"
          className="w-9 h-9 rounded-full bg-ink-950 dark:bg-white text-white dark:text-ink-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-fast ease-smooth shadow-sm"
        >
          <User color="currentColor" size={18} strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
