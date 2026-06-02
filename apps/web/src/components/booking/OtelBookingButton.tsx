// 'My OTEL Booking' — premium glass shortcut button that drops the
// resident into the partner hotel-booking flow. Opens in a new tab so
// the booking screen they were on is preserved.
//
// The destination is a single configurable constant; switch to a real
// partner URL or referral-tagged link when the integration lands.

import { BedDouble, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Partner destination. Placeholder until the real integration is wired. */
const OTEL_PARTNER_URL = 'https://www.booking.com';

/** Premium glass action button — drops the resident into the partner
 *  hotel-booking flow in a fresh tab. Renders with the same curved-glass
 *  vocabulary the rest of the booking screens use. */
export function OtelBookingButton({
  className = '',
  compact = false,
}: {
  className?: string;
  /** When true, hides the subtitle line for tight header layouts. */
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const handleClick = () => {
    window.open(OTEL_PARTNER_URL, '_blank', 'noopener,noreferrer');
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={t('booking.otel.title')}
      className={[
        'group relative inline-flex items-center gap-2 overflow-hidden',
        // Ultra-curved corners — full rounded-3xl on the wrapper so the
        // chip reads as part of the reference-image vocabulary.
        'rounded-3xl px-3 py-2',
        // Warm-tinted glass surface — amber/rose wash matches the
        // cream backdrop the booking screens now sit on.
        'bg-gradient-to-br from-amber-50/80 via-white/70 to-rose-50/60',
        'dark:from-ink-700/70 dark:via-ink-700/70 dark:to-ink-700/70',
        'backdrop-blur-lg',
        'border border-white/60 dark:border-white/10',
        'shadow-lg shadow-amber-500/10',
        // Tactile micro-interactions.
        'hover:from-amber-50 hover:to-rose-50 hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/20',
        'active:scale-95',
        'transition-all duration-300 ease-smooth',
        className,
      ].join(' ')}
    >
      <span className="w-8 h-8 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-200 to-rose-200 dark:from-brand-700/40 dark:to-violet-700/40 ring-1 ring-white/50 shadow-sm shadow-amber-500/20">
        <BedDouble size={16} className="text-amber-800 dark:text-brand-100" />
      </span>
      <span className="flex flex-col items-start min-w-0">
        <span className="text-xs font-bold text-ink-900 dark:text-white leading-tight whitespace-nowrap">
          {t('booking.otel.title')}
        </span>
        {!compact && (
          <span className="text-[10px] text-ink-500 dark:text-ink-100 leading-tight whitespace-nowrap">
            {t('booking.otel.subtitle')}
          </span>
        )}
      </span>
      <ExternalLink
        size={12}
        className="text-ink-400 group-hover:text-brand-600 transition-colors"
      />
    </button>
  );
}
