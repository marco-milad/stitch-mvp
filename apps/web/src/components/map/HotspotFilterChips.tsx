import { useTranslation } from 'react-i18next';

import { CATEGORY_ORDER, HOTSPOT_TONE, type HotspotCategory } from '@/lib/mock/compoundMap';

export type FilterKey = 'all' | HotspotCategory;

interface Props {
  value: FilterKey;
  onChange: (v: FilterKey) => void;
}

export function HotspotFilterChips({ value, onChange }: Props) {
  const { t } = useTranslation();
  const chips: FilterKey[] = ['all', ...CATEGORY_ORDER];
  return (
    <div className="flex flex-row gap-2 overflow-x-auto px-4 py-3 bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-700">
      {chips.map((chip) => {
        const active = chip === value;
        const tone = chip === 'all' ? null : HOTSPOT_TONE[chip];
        return (
          <button
            key={chip}
            type="button"
            onClick={() => onChange(chip)}
            aria-pressed={active ? 'true' : 'false'}
            className={[
              'flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
              active
                ? 'bg-ink-900 text-white border-ink-900 dark:bg-white dark:text-ink-900 dark:border-white'
                : 'bg-white dark:bg-ink-700 text-ink-700 dark:text-white border-ink-100 dark:border-ink-700 hover:border-brand-400',
            ].join(' ')}
          >
            {tone && (
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: tone.dot }}
              />
            )}
            {t(`services.compoundMap.filters.${chip}`)}
          </button>
        );
      })}
    </div>
  );
}
