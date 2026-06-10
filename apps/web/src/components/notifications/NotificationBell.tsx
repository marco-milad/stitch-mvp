// Global notification bell — sits in the resident-side TopBar.
//
// Two visual states:
//   - Quiet  → no unread; muted-ink icon, no badge
//   - Pulsing → unread > 0; the bell carries the accent dot, and the
//     badge shows the count (capped to "9+" so the chip stays compact)
//
// Click opens a sand-toned dropdown anchored to the bell. Outside-click
// and Escape dismiss it. "Mark all as read" sits at the top of the
// panel as the primary action so power users can clear the badge
// without scrolling. Notification rows are tap-targets — clicking one
// (a) marks all read (b) navigates to the row's deep-link if present.

import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Bell, CheckCheck, Sparkles, Wrench, ShieldAlert } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { NotificationKind, ResidentNotification } from '@/lib/residentApi';
import { useMarkAllRead, useMyNotifications } from '@/lib/useNotifications';

const KIND_STYLES: Record<NotificationKind, { Icon: typeof Wrench; bg: string; fg: string }> = {
  ticket_created: { Icon: Sparkles, bg: 'bg-amber-100', fg: 'text-amber-700' },
  ticket_dispatched: { Icon: Wrench, bg: 'bg-violet-100', fg: 'text-violet-700' },
  ticket_resolved: { Icon: ShieldAlert, bg: 'bg-emerald-100', fg: 'text-emerald-700' },
};

const PANEL_VARIANTS: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.97,
    transition: { duration: 0.14, ease: [0.32, 0.72, 0, 1] },
  },
};

function relativeLabel(iso: string, lang: 'en' | 'ar'): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return lang === 'ar' ? 'دلوقتي' : 'just now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
}

interface NotificationBellProps {
  /** Optional className for the outer button so the TopBar can swap
   *  size/ring without forking the component. */
  className?: string;
}

// Width of the panel — kept as a constant so the position math and
// the className width agree without drifting. Phone-viewport sizes
// (the MobileShell is 28rem wide) shrink to a fluid value.
const PANEL_WIDTH_PX = 320;

interface AnchorRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { notifications, unreadCount } = useMyNotifications();
  const markAllRead = useMarkAllRead();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Outside-click + Escape to dismiss. Pointerdown so we close before
  // the second click registers on the bell itself (which would re-open
  // the panel a frame later). Includes the portaled panel via panelRef
  // so clicking inside the dropdown doesn't close it.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Track the bell's viewport rect so the portaled panel can anchor
  // beneath it. Recomputes on scroll/resize so the dropdown follows
  // the bell when the user scrolls the page while it's open. Capture
  // phase on scroll so we catch every scroll container, including the
  // document.
  useEffect(() => {
    if (!open) {
      setAnchor(null);
      return;
    }
    const update = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      setAnchor({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  const lang: 'en' | 'ar' = i18n.language === 'ar' ? 'ar' : 'en';
  const badgeLabel = unreadCount > 9 ? '9+' : `${unreadCount}`;
  const isRtl = i18n.dir() === 'rtl';

  const onRowTap = useCallback(
    (n: ResidentNotification) => {
      markAllRead();
      if (n.link) navigate(n.link);
      setOpen(false);
    },
    [markAllRead, navigate],
  );

  // Position the portaled panel. LTR: anchor to the right edge of the
  // bell. RTL: anchor to the left edge so it opens toward the page
  // interior. Either way, top sits a small gap below the bell.
  const panelStyle: React.CSSProperties = anchor
    ? isRtl
      ? { position: 'fixed', top: anchor.bottom + 8, left: anchor.left }
      : {
          position: 'fixed',
          top: anchor.bottom + 8,
          right: Math.max(8, window.innerWidth - anchor.right),
        }
    : { position: 'fixed', top: 0, right: 0, visibility: 'hidden' };

  const panel = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          key="panel"
          variants={PANEL_VARIANTS}
          initial="hidden"
          animate="show"
          exit="exit"
          role="dialog"
          aria-label={t('notifications.title')}
          style={{ ...panelStyle, width: PANEL_WIDTH_PX, maxWidth: 'calc(100vw - 16px)' }}
          // z-[60] beats the floating toast host (z-50) so a stack of
          // toasts can't obscure the dropdown the user just opened, and
          // beats any backdrop-blur-created stacking context on the page
          // since this is a body-portal escapee.
          className="z-[60] bg-sand-50 dark:bg-ink-800 rounded-3xl border border-sand-200/60 dark:border-ink-700 shadow-2xl overflow-hidden origin-top-end"
        >
          <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-sand-200/60 dark:border-ink-700 bg-white/80 dark:bg-ink-900/80">
            <div className="flex flex-col min-w-0">
              <h2 className="text-sm font-bold text-ink-950 dark:text-white leading-tight truncate">
                {t('notifications.title')}
              </h2>
              <p className="text-[11px] text-ink-500 dark:text-ink-100 leading-tight truncate">
                {unreadCount > 0
                  ? t('notifications.unreadCount', { count: unreadCount })
                  : t('notifications.allRead')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => markAllRead()}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-ink-950 dark:bg-white text-white dark:text-ink-950 shadow-sm hover:shadow-md active:scale-95 transition-all duration-base ease-smooth disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <CheckCheck size={12} />
              {t('notifications.markAllRead')}
            </button>
          </header>

          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-ink-500 dark:text-ink-100 text-sm">
                {t('notifications.empty')}
              </div>
            ) : (
              <ul role="list" className="divide-y divide-sand-200/60 dark:divide-ink-700">
                {notifications.map((n) => (
                  <BellRow key={n.id} notification={n} lang={lang} onTap={() => onRowTap(n)} />
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-label={t('notifications.bellAria')}
        aria-expanded={open}
        className={[
          // Sized + shaped to match ThemeToggle (the sibling button) so
          // the chrome row reads as a coherent triplet. Translucent
          // background gives the bell clear contrast against the
          // ink-900 page surface in dark mode — solid ink-800 was
          // disappearing into the backdrop.
          'group relative w-9 h-9 rounded-full bg-white/60 dark:bg-ink-700/60 backdrop-blur-md border border-white/40 dark:border-white/10 text-ink-700 dark:text-white flex items-center justify-center hover:bg-white/80 dark:hover:bg-ink-700/80 hover:scale-105 active:scale-95 transition-all duration-200 ease-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-950',
          className,
        ].join(' ')}
      >
        <Bell size={18} strokeWidth={2} />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 rtl:-left-0.5 rtl:right-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold tabular-nums flex items-center justify-center ring-2 ring-sand-50 dark:ring-ink-900"
          >
            {badgeLabel}
          </span>
        )}
      </button>

      {/* Render the panel via a portal so it escapes any backdrop-blur
          stacking context (the Home weather card, MobileShell wrapper,
          etc.) that was otherwise painting on top of an `absolute`
          dropdown. Fixed positioning keeps it anchored under the bell
          even as the page scrolls. */}
      {typeof document !== 'undefined' && createPortal(panel, document.body)}
    </div>
  );
}

function BellRow({
  notification,
  lang,
  onTap,
}: {
  notification: ResidentNotification;
  lang: 'en' | 'ar';
  onTap: () => void;
}) {
  const style = KIND_STYLES[notification.kind];
  const Icon = style.Icon;
  const title = notification.title[lang];
  const body = notification.body[lang];
  const unread = !notification.isRead;
  return (
    <li>
      <button
        type="button"
        onClick={onTap}
        className={[
          'w-full text-start px-4 py-3 flex flex-row items-start gap-3 transition-colors duration-base hover:bg-white dark:hover:bg-ink-700',
          unread ? 'bg-white/60 dark:bg-ink-700/60' : '',
        ].join(' ')}
      >
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${style.bg} ${style.fg}`}
        >
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={[
                'text-[13px] leading-snug truncate',
                unread
                  ? 'font-bold text-ink-950 dark:text-white'
                  : 'font-semibold text-ink-700 dark:text-ink-100',
              ].join(' ')}
            >
              {title}
            </p>
            <span className="text-[10px] text-ink-400 tabular-nums flex-shrink-0">
              {relativeLabel(notification.createdAt, lang)}
            </span>
          </div>
          <p className="text-[11px] text-ink-500 dark:text-ink-100 leading-snug mt-0.5 line-clamp-2">
            {body}
          </p>
        </div>
        {unread && (
          <span aria-hidden className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
        )}
      </button>
    </li>
  );
}
