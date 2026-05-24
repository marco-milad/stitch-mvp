// Notifications center — premium card list driven by:
//   - `GET /api/v1/me/notifications` (TanStack Query)
//   - `WS /api/v1/me/notifications/stream` (snapshot + push)
//
// Read state lives in localStorage (`stitch.notifications.read`). On
// mount we mark whatever's already on screen as read so the TopBar bell
// dot clears the moment the user opens this screen. New items arriving
// after that stay unread (red dot + NEW pill) until the next mount or
// explicit "Mark all" tap.

import { ArrowLeft, CheckCheck, ShieldAlert, Sparkles, Wrench } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Skeleton } from '@/components/ui/Skeleton';
import { markIdsRead, useMarkAllRead, useMyNotifications } from '@/lib/useNotifications';
import type { NotificationKind, ResidentNotification } from '@/lib/residentApi';

// ─── Visual mapping per kind ──────────────────────────────────────────

interface KindStyle {
  Icon: typeof Wrench;
  iconBg: string;
  iconFg: string;
}

const KIND_STYLES: Record<NotificationKind, KindStyle> = {
  ticket_created: {
    Icon: Sparkles,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconFg: 'text-amber-700 dark:text-amber-300',
  },
  ticket_dispatched: {
    Icon: Wrench,
    iconBg: 'bg-violet-100 dark:bg-violet-900/30',
    iconFg: 'text-violet-700 dark:text-violet-300',
  },
  ticket_resolved: {
    Icon: ShieldAlert,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconFg: 'text-emerald-700 dark:text-emerald-300',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────

function relativeKey(iso: string): { key: string; value?: number } {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return { key: 'notifications.relative.justNow' };
  if (min < 60) return { key: 'notifications.relative.mAgo', value: min };
  const hr = Math.floor(min / 60);
  if (hr < 24) return { key: 'notifications.relative.hAgo', value: hr };
  const day = Math.floor(hr / 24);
  return { key: 'notifications.relative.dAgo', value: day };
}

// ─── Screen ───────────────────────────────────────────────────────────

export function Notifications() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { notifications, isLoading, isLive, readIds } = useMyNotifications();
  const markAllRead = useMarkAllRead();

  // On first paint, mark everything currently on screen as read so the bell
  // dot clears immediately. New items that arrive via WS while the screen
  // is open stay unread (NEW pill) until next mount.
  useEffect(() => {
    if (notifications.length === 0) return;
    markIdsRead(notifications.map((n) => n.id));
    // intentionally NOT dependent on `notifications` — only fire once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(
    () => [...notifications].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [notifications],
  );

  const lang: 'en' | 'ar' = i18n.language === 'ar' ? 'ar' : 'en';
  const anyUnread = sorted.some((n) => !readIds.has(n.id));

  return (
    <div className="flex flex-col min-h-screen bg-ink-50 dark:bg-ink-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 dark:bg-ink-900/95 backdrop-blur border-b border-ink-100 dark:border-ink-700 px-3 py-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label={t('notifications.back')}
          className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700"
        >
          <ArrowLeft size={20} className="text-ink-700 dark:text-white rtl:rotate-180" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-extrabold text-ink-900 dark:text-white leading-tight truncate">
            {t('notifications.title')}
          </h1>
          <p className="text-[11px] text-ink-500 dark:text-ink-100 leading-tight truncate">
            {t('notifications.subtitle')}
          </p>
        </div>
        <LivePill connected={isLive} />
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {isLoading && sorted.length === 0 ? (
          <LoadingSkeleton />
        ) : sorted.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {anyUnread && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300 hover:underline"
                >
                  <CheckCheck size={12} />
                  {t('notifications.markAllRead')}
                </button>
              </div>
            )}

            {sorted.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                lang={lang}
                isUnread={!readIds.has(n.id)}
                onTap={() => {
                  if (n.link) navigate(n.link);
                }}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────

function LivePill({ connected }: { connected: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider border',
        connected
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-ink-100 border-ink-200 text-ink-500',
      ].join(' ')}
    >
      <span
        className={[
          'w-1.5 h-1.5 rounded-full',
          connected ? 'bg-emerald-500 animate-pulse' : 'bg-ink-400',
        ].join(' ')}
      />
      {connected ? t('notifications.live') : t('notifications.offline')}
    </span>
  );
}

function NotificationCard({
  notification,
  lang,
  isUnread,
  onTap,
}: {
  notification: ResidentNotification;
  lang: 'en' | 'ar';
  isUnread: boolean;
  onTap: () => void;
}) {
  const { t } = useTranslation();
  const style = KIND_STYLES[notification.kind];
  const Icon = style.Icon;
  const interactive = !!notification.link;
  const rel = relativeKey(notification.createdAt);

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={!interactive}
      className={[
        'group relative w-full text-start flex flex-row items-start gap-3 p-3.5 rounded-2xl border transition-all animate-ticket-in',
        isUnread
          ? 'bg-white dark:bg-ink-700 border-brand-200 dark:border-brand-700/40 shadow-sm shadow-brand-500/10'
          : 'bg-white dark:bg-ink-700 border-ink-100 dark:border-ink-700',
        interactive ? 'hover:border-brand-300 active:scale-[0.998]' : 'cursor-default',
      ].join(' ')}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${style.iconBg}`}
      >
        <Icon size={18} className={style.iconFg} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-row items-start gap-2">
          <p className="flex-1 text-sm font-bold text-ink-900 dark:text-white leading-snug">
            {notification.title[lang]}
          </p>
          {isUnread && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-500 text-white flex-shrink-0">
              {t('notifications.newBadge')}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[12px] text-ink-700 dark:text-ink-100 leading-snug line-clamp-3">
          {notification.body[lang]}
        </p>
        <p className="mt-1 text-[10px] text-ink-500 tabular-nums">
          {rel.value !== undefined ? t(rel.key, { value: rel.value }) : t(rel.key)}
        </p>
      </div>

      {isUnread && (
        <span className="absolute top-3 end-3 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      )}
    </button>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="relative mb-4">
        <div className="absolute inset-0 -m-3 rounded-full bg-brand-100/40 dark:bg-brand-700/20 animate-pulse" />
        <span className="relative text-5xl">{t('notifications.empty.emoji')}</span>
      </div>
      <h2 className="text-base font-extrabold text-ink-900 dark:text-white mb-1">
        {t('notifications.empty.title')}
      </h2>
      <p className="text-sm text-ink-500 dark:text-ink-100 max-w-xs leading-relaxed">
        {t('notifications.empty.subtitle')}
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-ink-700 rounded-2xl p-3.5 border border-ink-100 dark:border-ink-700 flex flex-row gap-3"
        >
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
