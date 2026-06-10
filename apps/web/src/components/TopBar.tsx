import { User } from 'lucide-react';

import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useNavigateWithTransition } from '@/lib/viewTransition';

interface TopBarProps {
  title: string;
  /** Deprecated — `NotificationBell` reads its own unread count via
   *  `useMyNotifications()`. Kept on the props so legacy callers that
   *  still pass it compile without changes. */
  unreadCount?: number;
}

export function TopBar({ title }: TopBarProps) {
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
        <NotificationBell />

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
