import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  daysFromToday,
  formatMonthYear,
  getMonthGrid,
  getWeekdayShortLabels,
  isPastDay,
  isSameDay,
  toDateIso,
} from '@/lib/dates';

const MAX_DAYS_FORWARD = 60;

interface Props {
  /** Selected date as a JS Date (null when nothing picked). */
  value: Date | null;
  onChange: (date: Date) => void;
  /** Returns true when the given date is unavailable (e.g. Fridays for showroom). */
  isDisabled?: (date: Date) => boolean;
}

/**
 * Custom month-grid calendar. Locale-aware month/weekday labels via Intl,
 * with past dates + dates > 60 days out + caller-supplied disabled days
 * all non-selectable. Numbers (day-of-month) use tabular-nums to keep the
 * grid columns aligned across locales.
 */
export function Calendar({ value, onChange, isDisabled }: Props) {
  const { i18n } = useTranslation();
  const [view, setView] = useState<{ year: number; month: number }>(() => {
    const init = value ?? new Date();
    return { year: init.getFullYear(), month: init.getMonth() };
  });

  const cells = useMemo(() => getMonthGrid(view.year, view.month), [view]);
  const weekdays = useMemo(() => getWeekdayShortLabels(i18n.language), [i18n.language]);

  const monthCursor = new Date(view.year, view.month, 1);

  const goPrev = () => {
    setView((v) => {
      const d = new Date(v.year, v.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };
  const goNext = () => {
    setView((v) => {
      const d = new Date(v.year, v.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <div className="rounded-3xl border border-white/60 dark:border-ink-700 bg-white/75 dark:bg-ink-700 backdrop-blur-md shadow-lg shadow-ink-900/5 overflow-hidden">
      {/* Header */}
      <div className="flex flex-row items-center justify-between px-3 py-2 border-b border-white/60 dark:border-ink-700">
        <button
          type="button"
          onClick={goPrev}
          aria-label="Previous month"
          className="w-9 h-9 rounded-2xl flex items-center justify-center bg-white/70 backdrop-blur-sm border border-white/50 hover:bg-white hover:scale-105 active:scale-95 text-ink-500 transition-all duration-200 ease-smooth"
        >
          <ChevronLeft size={16} className="rtl:rotate-180" />
        </button>
        <p className="text-sm font-bold text-ink-900 dark:text-white">
          {formatMonthYear(monthCursor, i18n.language)}
        </p>
        <button
          type="button"
          onClick={goNext}
          aria-label="Next month"
          className="w-9 h-9 rounded-2xl flex items-center justify-center bg-white/70 backdrop-blur-sm border border-white/50 hover:bg-white hover:scale-105 active:scale-95 text-ink-500 transition-all duration-200 ease-smooth"
        >
          <ChevronRight size={16} className="rtl:rotate-180" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 px-2 pt-2 text-[10px] font-bold uppercase tracking-widest text-ink-400 text-center">
        {weekdays.map((w) => (
          <span key={w} className="py-1">
            {w}
          </span>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 px-2 pb-2 gap-0.5">
        {cells.map((cell) => {
          const past = isPastDay(cell.date);
          const tooFar = daysFromToday(cell.date) > MAX_DAYS_FORWARD;
          const ruleDisabled = isDisabled?.(cell.date) ?? false;
          const disabled = past || tooFar || ruleDisabled;
          const selected = value ? isSameDay(cell.date, value) : false;
          const today = isSameDay(cell.date, new Date());

          return (
            <button
              key={toDateIso(cell.date)}
              type="button"
              disabled={disabled}
              onClick={() => onChange(cell.date)}
              aria-pressed={selected ? 'true' : 'false'}
              className={[
                'aspect-square flex items-center justify-center text-xs font-semibold rounded-2xl transition-all duration-200 ease-smooth tabular-nums',
                !cell.inMonth && !selected ? 'text-ink-400/40' : '',
                disabled
                  ? 'text-ink-400/40 cursor-not-allowed'
                  : 'hover:bg-brand-50 dark:hover:bg-brand-700/30',
                selected
                  ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white hover:from-brand-500 hover:to-brand-600 shadow-md shadow-brand-500/30 scale-[1.04] ring-1 ring-white/40'
                  : '',
                !selected && today && !disabled
                  ? 'ring-1 ring-brand-400 text-brand-600 dark:text-brand-400'
                  : '',
                !selected && !today && cell.inMonth && !disabled
                  ? 'text-ink-900 dark:text-white'
                  : '',
              ].join(' ')}
            >
              {cell.date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
