// Floating toast host — listens for newly-arrived notifications via
// `useNewNotificationsHandler` and queues a brief, dismissable card in
// the top-right (top-left in RTL) of the viewport. Each toast slides in,
// stays for 4 seconds, and fades out — clicking it dismisses early and
// follows the deep-link if one is attached.
//
// Mounted once at the app root (App.tsx) below the router so the toast
// has access to navigation. Lives at z-index 50 so it floats above the
// MobileShell card but below any modal that might already use the
// inner stack.

import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { ResidentNotification } from '@/lib/residentApi';
import { useNewNotificationsHandler } from '@/lib/useNotifications';

const TOAST_DURATION_MS = 4000;
const MAX_VISIBLE = 3;

const TOAST_VARIANTS: Variants = {
  hidden: { opacity: 0, x: 24, scale: 0.96 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] },
  },
  exit: {
    opacity: 0,
    x: 24,
    scale: 0.96,
    transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] },
  },
};

interface ActiveToast {
  notification: ResidentNotification;
  /** Stable per-render key so AnimatePresence handles enter/exit
   *  cleanly even when two notifications share an id (impossible
   *  today, but guards against backend dup re-emits). */
  key: string;
}

export function NotificationToastHost() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  const onArrival = useCallback((n: ResidentNotification) => {
    setToasts((prev) => {
      // De-dup if the same id is already on screen.
      if (prev.some((tx) => tx.notification.id === n.id)) return prev;
      const next: ActiveToast[] = [...prev, { notification: n, key: `${n.id}-${Date.now()}` }];
      // Cap the stack — the oldest gets evicted so a rapid burst
      // doesn't overflow the viewport.
      return next.length > MAX_VISIBLE ? next.slice(-MAX_VISIBLE) : next;
    });
  }, []);

  useNewNotificationsHandler(onArrival);

  // Auto-dismiss timers. Each toast clears itself after TOAST_DURATION_MS.
  useEffect(() => {
    if (toasts.length === 0) return undefined;
    const timers = toasts.map((tx) =>
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t2) => t2.key !== tx.key));
      }, TOAST_DURATION_MS),
    );
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [toasts]);

  const dismiss = useCallback((key: string) => {
    setToasts((prev) => prev.filter((tx) => tx.key !== key));
  }, []);

  const lang: 'en' | 'ar' = i18n.language === 'ar' ? 'ar' : 'en';

  return (
    <div
      // Top-end positioning works for both LTR (top-right) and RTL
      // (top-left) since we use logical end-4. Pointer-events-none on
      // the wrapper so the area between toasts doesn't block clicks on
      // whatever's underneath.
      aria-live="polite"
      aria-label={t('notifications.toastsAria')}
      className="fixed top-4 end-4 z-50 flex flex-col gap-2 pointer-events-none w-[min(360px,calc(100vw-2rem))]"
    >
      <AnimatePresence initial={false}>
        {toasts.map((tx) => {
          const { notification: n, key } = tx;
          const title = n.title[lang];
          const body = n.body[lang];
          return (
            <motion.div
              key={key}
              layout
              variants={TOAST_VARIANTS}
              initial="hidden"
              animate="show"
              exit="exit"
              role="status"
              className="pointer-events-auto bg-ink-950 dark:bg-white text-white dark:text-ink-950 rounded-2xl shadow-xl border border-ink-800/40 dark:border-sand-200/60 overflow-hidden flex flex-row items-stretch"
            >
              {/* Click-to-dismiss + follow-link body. Sibling to the X
                  button so we never nest interactive elements. */}
              <button
                type="button"
                onClick={() => {
                  if (n.link) navigate(n.link);
                  dismiss(key);
                }}
                className="flex-1 text-start px-4 py-3 flex flex-row items-start gap-3 hover:bg-white/5 dark:hover:bg-ink-950/5 transition-colors duration-base"
              >
                <div className="w-8 h-8 rounded-xl bg-white/10 dark:bg-ink-950/10 flex items-center justify-center flex-shrink-0">
                  <Bell size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold leading-tight truncate">{title}</p>
                  <p className="text-[12px] opacity-80 leading-snug mt-0.5 line-clamp-2">{body}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => dismiss(key)}
                aria-label={t('notifications.toastDismiss')}
                className="flex-shrink-0 px-3 hover:bg-white/10 dark:hover:bg-ink-950/10 transition-colors duration-base"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
