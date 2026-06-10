// Real-time per-slot capacity ribbon. Renders the 8 slots of the
// chosen day in a horizontal scrollable row with their current
// load (used / 3). Clicking a chip filters the table down to that
// slot; clicking it again clears the slot filter.
//
// Counts come from the rows the parent has already filtered down to
// the selected day — keeps this component a pure presentation layer
// and avoids re-doing the date-equality check twice.

import { useTranslation } from 'react-i18next';

import {
  CAPACITY_PER_SLOT,
  MAINTENANCE_TIME_SLOTS,
  slotTone,
  type MaintenanceTimeSlot,
} from '@/lib/slots';

interface Props {
  /** Map of slot label → count of rows scheduled into that slot on the
   *  selected day. Slots not in the map render as 0. */
  countsBySlot: Map<string, number>;
  /** When set, the matching chip is highlighted. `null` = "any slot". */
  selectedSlot: string | null;
  /** Toggle handler: pass the slot label to select, `null` to clear. */
  onSelectSlot: (slot: MaintenanceTimeSlot | null) => void;
  /** Display label for the date the counts are for — passed in so the
   *  parent owns the formatting. */
  dateLabel: string;
}

const TONE_CLASSES: Record<'empty' | 'partial' | 'full', string> = {
  // Quiet sand surface — slot has room, but the chip still has presence.
  empty: 'bg-sand-50 border-sand-200 text-ink-700 hover:border-ink-400',
  // Partial fill — amber to signal "filling up but still bookable".
  partial: 'bg-amber-50 border-amber-200 text-amber-800 hover:border-amber-400',
  // At capacity — red to mirror the resident-side "Full" diagonal stripes.
  full: 'bg-red-50 border-red-300 text-red-800 hover:border-red-400',
};

const SELECTED_OUTLINE = 'ring-2 ring-ink-950 ring-offset-1 ring-offset-white';

export function SlotLoadRibbon({ countsBySlot, selectedSlot, onSelectSlot, dateLabel }: Props) {
  const { t } = useTranslation();
  const totalScheduled = Array.from(countsBySlot.values()).reduce((s, n) => s + n, 0);
  const capacityCeiling = MAINTENANCE_TIME_SLOTS.length * CAPACITY_PER_SLOT;

  return (
    <section
      aria-label={t('admin.slotRibbon.aria')}
      className="bg-white border border-ink-100 rounded-2xl p-4 shadow-sm"
    >
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="flex flex-col min-w-0">
          <h3 className="text-sm font-bold text-ink-950 leading-tight truncate">
            {t('admin.slotRibbon.title', { date: dateLabel })}
          </h3>
          <p className="text-[11px] text-ink-500 leading-tight truncate">
            {t('admin.slotRibbon.subtitle')}
          </p>
        </div>
        <span className="text-[11px] text-ink-500 tabular-nums flex-shrink-0">
          {t('admin.slotRibbon.total', { used: totalScheduled, capacity: capacityCeiling })}
        </span>
      </div>

      <div className="flex flex-row gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {MAINTENANCE_TIME_SLOTS.map((slot) => {
          const count = countsBySlot.get(slot) ?? 0;
          const tone = slotTone(count);
          const isSelected = selectedSlot === slot;
          return (
            <button
              key={slot}
              type="button"
              onClick={() => onSelectSlot(isSelected ? null : slot)}
              aria-pressed={isSelected ? 'true' : 'false'}
              className={[
                'flex-shrink-0 flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border text-start transition-all duration-200',
                TONE_CLASSES[tone],
                isSelected ? SELECTED_OUTLINE : '',
              ].join(' ')}
            >
              <span className="text-[11px] font-semibold tabular-nums" dir="ltr">
                {slot}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {tone === 'full'
                  ? t('admin.slotRibbon.full', { count, capacity: CAPACITY_PER_SLOT })
                  : t('admin.slotRibbon.partial', { count, capacity: CAPACITY_PER_SLOT })}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
