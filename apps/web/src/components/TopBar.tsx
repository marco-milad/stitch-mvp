import { Bell, User } from 'lucide-react';

import { useNavigateWithTransition } from '@/lib/viewTransition';
import { colors } from '@/lib/theme';

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
  return (
    <div className="flex flex-row items-center justify-between px-4 pt-3 pb-3 bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-700">
      <span className="text-xl font-semibold text-ink-900 dark:text-white">{title}</span>

      <div className="flex flex-row items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          aria-label="Notifications"
          className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/60 hover:scale-105 active:scale-95 transition-all duration-200 ease-smooth"
        >
          <Bell color={colors.ink[700]} size={22} />
          {unreadCount !== undefined && unreadCount > 0 && (
            <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate('/profile')}
          aria-label="Profile"
          className="w-9 h-9 rounded-full bg-white/60 dark:bg-ink-700/60 backdrop-blur-md border border-white/40 dark:border-white/10 flex items-center justify-center hover:bg-white/80 hover:scale-105 active:scale-95 transition-all duration-200 ease-smooth"
        >
          <User color={colors.ink[500]} size={18} />
        </button>
      </div>
    </div>
  );
}
