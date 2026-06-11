import { useTranslation } from 'react-i18next';

import { availableSlots, formatSlotRange } from '@/lib/mock/booking';
import type { VisitType } from '@/lib/schemas/booking';

interface Props {
  date: Date | null;
  visitType: VisitType | undefined;
  value: string | undefined;
  onChange: (slot: string) => void;
  /** Slots the picked advisor has already confirmed on the picked
   *  date. Rendered as disabled chips so the prospect literally can't
   *  tap them. Empty array (default) → all slots clickable. */
  busySlots?: readonly string[];
}

/**
 * Renders the available slot chips for a given (date, visit-type). When
 * either prereq is missing, shows an inline hint instead of an empty grid.
 *
 * `busySlots` greys out slots already locked by the advisor's confirmed
 * bookings — the chip is non-clickable and carries a "Booked" badge so
 * the conflict is legible at a glance.
 */
export function TimeSlotPicker({ date, visitType, value, onChange, busySlots = [] }: Props) {
  const { t } = useTranslation();

  if (!date || !visitType) {
    return (
      <p className="text-[11px] text-ink-500 dark:text-ink-100">
        {t('discover.book.slotsPickFirst')}
      </p>
    );
  }

  const slots = availableSlots(date, visitType);

  if (slots.length === 0) {
    return (
      <p className="text-[11px] text-amber-700 dark:text-amber-300">{t('discover.book.noSlots')}</p>
    );
  }

  const busy = new Set(busySlots);

  return (
    <div className="flex flex-row flex-wrap gap-2">
      {slots.map((slot) => {
        const active = slot === value;
        const isBusy = busy.has(slot);
        return (
          <button
            key={slot}
            type="button"
            onClick={() => !isBusy && onChange(slot)}
            disabled={isBusy}
            aria-pressed={active}
            aria-disabled={isBusy}
            title={isBusy ? t('discover.book.slotBookedTitle') : undefined}
            className={[
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors tabular-nums',
              isBusy
                ? 'bg-ink-100 dark:bg-ink-700/50 text-ink-400 dark:text-ink-100/60 border-ink-100 dark:border-ink-700 line-through cursor-not-allowed'
                : active
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white dark:bg-ink-700 text-ink-700 dark:text-white border-ink-100 dark:border-ink-700 hover:border-brand-400',
            ].join(' ')}
          >
            <span dir="ltr">{formatSlotRange(slot)}</span>
            {isBusy && (
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                {t('discover.book.slotBookedBadge')}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
