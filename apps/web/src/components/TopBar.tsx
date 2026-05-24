import { Bell, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { colors } from '@/lib/theme';

interface TopBarProps {
  title: string;
  /** When provided and > 0, shows a small unread indicator on the bell icon. */
  unreadCount?: number;
}

export function TopBar({ title, unreadCount }: TopBarProps) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-row items-center justify-between px-4 pt-3 pb-3 bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-700">
      <span className="text-xl font-semibold text-ink-900 dark:text-white">{title}</span>

      <div className="flex flex-row items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          aria-label="Notifications"
          className="relative w-10 h-10 flex items-center justify-center"
        >
          <Bell color={colors.ink[700]} size={22} />
          {unreadCount !== undefined && unreadCount > 0 && (
            <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-brand-500" />
          )}
        </button>

        <button
          type="button"
          aria-label="Profile"
          className="w-9 h-9 rounded-full bg-ink-100 dark:bg-ink-700 flex items-center justify-center"
        >
          <User color={colors.ink[500]} size={18} />
        </button>
      </div>
    </div>
  );
}
