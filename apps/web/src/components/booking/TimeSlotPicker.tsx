import { useTranslation } from 'react-i18next';

import { availableSlots, formatSlotRange } from '@/lib/mock/booking';
import type { VisitType } from '@/lib/schemas/booking';

interface Props {
  date: Date | null;
  visitType: VisitType | undefined;
  value: string | undefined;
  onChange: (slot: string) => void;
}

/**
 * Renders the available slot chips for a given (date, visit-type). When
 * either prereq is missing, shows an inline hint instead of an empty grid.
 */
export function TimeSlotPicker({ date, visitType, value, onChange }: Props) {
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

  return (
    <div className="flex flex-row flex-wrap gap-2">
      {slots.map((slot) => {
        const active = slot === value;
        return (
          <button
            key={slot}
            type="button"
            onClick={() => onChange(slot)}
            aria-pressed={active ? 'true' : 'false'}
            className={[
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors tabular-nums',
              active
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white dark:bg-ink-700 text-ink-700 dark:text-white border-ink-100 dark:border-ink-700 hover:border-brand-400',
            ].join(' ')}
          >
            <span dir="ltr">{formatSlotRange(slot)}</span>
          </button>
        );
      })}
    </div>
  );
}
