// Date + slot + category filter triple.
//
// Used above the table on both ServiceRequests and ServiceBookings so
// the same filter shape applies whether the admin is browsing
// maintenance dispatch or vendor bookings. Category list is supplied
// by the parent so this component stays generic (categories for
// maintenance, tileIds for bookings).

import { useTranslation } from 'react-i18next';

import {
  MAINTENANCE_TIME_SLOTS,
  UNSCHEDULED_SENTINEL,
  type MaintenanceTimeSlot,
} from '@/lib/slots';

export interface SlotCategoryOption {
  value: string;
  label: string;
}

interface Props {
  dateIso: string;
  onDateChange: (iso: string) => void;
  slot: string | null;
  onSlotChange: (slot: MaintenanceTimeSlot | typeof UNSCHEDULED_SENTINEL | null) => void;
  category: string | null;
  onCategoryChange: (cat: string | null) => void;
  categories: SlotCategoryOption[];
  /** i18n key prefix for the category label (e.g. "requests.filters.categoryLabel"). */
  categoryLabelKey: string;
}

export function SlotFilterPanel({
  dateIso,
  onDateChange,
  slot,
  onSlotChange,
  category,
  onCategoryChange,
  categories,
  categoryLabelKey,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-end gap-3 bg-white border border-ink-100 rounded-2xl p-3 shadow-sm">
      <Field label={t('admin.filterPanel.date')}>
        <input
          type="date"
          value={dateIso}
          onChange={(e) => onDateChange(e.target.value)}
          aria-label={t('admin.filterPanel.date')}
          className="px-3 py-1.5 rounded-lg border border-ink-200 bg-white text-sm text-ink-900 tabular-nums focus:outline-none focus:border-ink-400"
        />
      </Field>

      <Field label={t('admin.filterPanel.slot')}>
        <select
          value={slot ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '') return onSlotChange(null);
            if (v === UNSCHEDULED_SENTINEL) return onSlotChange(UNSCHEDULED_SENTINEL);
            onSlotChange(v as MaintenanceTimeSlot);
          }}
          aria-label={t('admin.filterPanel.slot')}
          className="px-3 py-1.5 rounded-lg border border-ink-200 bg-white text-sm text-ink-900 focus:outline-none focus:border-ink-400 min-w-[140px]"
        >
          <option value="">{t('admin.filterPanel.anySlot')}</option>
          {MAINTENANCE_TIME_SLOTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value={UNSCHEDULED_SENTINEL}>{t('admin.filterPanel.unscheduled')}</option>
        </select>
      </Field>

      <Field label={t(categoryLabelKey)}>
        <select
          value={category ?? ''}
          onChange={(e) => onCategoryChange(e.target.value === '' ? null : e.target.value)}
          aria-label={t(categoryLabelKey)}
          className="px-3 py-1.5 rounded-lg border border-ink-200 bg-white text-sm text-ink-900 focus:outline-none focus:border-ink-400 min-w-[160px]"
        >
          <option value="">{t('admin.filterPanel.anyCategory')}</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      {(slot !== null || category !== null) && (
        <button
          type="button"
          onClick={() => {
            onSlotChange(null);
            onCategoryChange(null);
          }}
          className="px-3 py-1.5 rounded-lg border border-ink-200 bg-white text-xs font-semibold text-ink-700 hover:border-ink-400 transition-colors"
        >
          {t('admin.filterPanel.clear')}
        </button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">{label}</span>
      {children}
    </label>
  );
}
