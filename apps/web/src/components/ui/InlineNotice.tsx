// Lightweight inline notice for inline form feedback — the alternative
// to window.alert() inside a controlled flow.
//
// Three tones (success / error / info), one icon per tone, auto-renders
// inside AnimatePresence with a slide-down + fade. Caller owns the
// dismiss timer; pass `onDismiss` to hide and re-trigger via state.
//
// Designed to be drop-in friendly: render `<InlineNotice notice={...} />`
// next to a form section, or above a CTA, with `null`-or-object state
// driving the show/hide. No portal, no global store — keeps the
// component local to the surface that produced the message.

import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type NoticeTone = 'success' | 'error' | 'info';

export interface InlineNoticeData {
  tone: NoticeTone;
  message: string;
  /** Optional secondary line — render below the message in smaller type. */
  detail?: string;
}

const TONE_STYLES: Record<NoticeTone, { wrap: string; icon: string; Icon: typeof CheckCircle2 }> = {
  success: {
    wrap: 'bg-emerald-50/95 border-emerald-200 text-emerald-900 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-100',
    icon: 'text-emerald-600 dark:text-emerald-300',
    Icon: CheckCircle2,
  },
  error: {
    wrap: 'bg-red-50/95 border-red-200 text-red-900 dark:bg-red-900/30 dark:border-red-700 dark:text-red-100',
    icon: 'text-red-600 dark:text-red-300',
    Icon: AlertCircle,
  },
  info: {
    wrap: 'bg-sand-100/95 border-sand-200 text-ink-900 dark:bg-ink-700/50 dark:border-ink-700 dark:text-white',
    icon: 'text-ink-500 dark:text-ink-100',
    Icon: Info,
  },
};

interface InlineNoticeProps {
  /** Pass `null` to dismiss; the AnimatePresence handles the exit. */
  notice: InlineNoticeData | null;
  onDismiss?: () => void;
  className?: string;
}

export function InlineNotice({ notice, onDismiss, className = '' }: InlineNoticeProps) {
  return (
    <AnimatePresence initial={false}>
      {notice && (
        <motion.div
          key={`${notice.tone}-${notice.message}`}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className={`overflow-hidden ${className}`}
        >
          <Body notice={notice} onDismiss={onDismiss} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Body({ notice, onDismiss }: { notice: InlineNoticeData; onDismiss?: () => void }) {
  const t = TONE_STYLES[notice.tone];
  const Icon = t.Icon;
  return (
    <div
      role={notice.tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-2xl border backdrop-blur-md px-3.5 py-3 shadow-sm ${t.wrap}`}
    >
      <Icon size={18} className={`flex-shrink-0 mt-0.5 ${t.icon}`} aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug">{notice.message}</p>
        {notice.detail && (
          <p className="text-[11px] opacity-75 mt-0.5 break-words leading-snug">{notice.detail}</p>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 p-1 -m-1 rounded-md hover:bg-white/40 dark:hover:bg-white/10 transition-colors duration-fast"
        >
          <X size={14} className={t.icon} />
        </button>
      )}
    </div>
  );
}
