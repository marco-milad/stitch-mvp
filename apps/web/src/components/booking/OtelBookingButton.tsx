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
        // Ultra-curved corners per the new design system tokens.
        'rounded-2xl px-3 py-2',
        // Premium glass surface — sits one tier above the page glass.
        'bg-white/70 dark:bg-ink-700/70 backdrop-blur-lg',
        'border border-white/50 dark:border-white/10',
        'shadow-lg shadow-ink-900/5',
        // Tactile micro-interactions.
        'hover:bg-white/90 hover:scale-[1.02] hover:shadow-xl hover:shadow-ink-900/10',
        'active:scale-95',
        'transition-all duration-300 ease-smooth',
        className,
      ].join(' ')}
    >
      <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-brand-100 to-violet-100 dark:from-brand-700/40 dark:to-violet-700/40 ring-1 ring-white/40">
        <BedDouble size={16} className="text-brand-700 dark:text-brand-100" />
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
