import { useTranslation } from 'react-i18next';

export interface ChipOption<V extends string | number> {
  value: V;
  /** i18n key — passed through `t()` at render time. */
  labelKey?: string;
  /** Literal label — used when the value itself is the display (e.g. percentages, years). */
  label?: string;
}

interface Props<V extends string | number> {
  options: ReadonlyArray<ChipOption<V>>;
  value: V | undefined;
  onChange: (v: V) => void;
  /** Optional aria-label for the chip group container. */
  ariaLabel?: string;
}

/**
 * Single-select chip picker. Used by the EOI form (string enums via labelKey)
 * and the price calculator (numeric enums via literal label).
 */
export function ChipPicker<V extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: Props<V>) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-row flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = opt.value === value;
        const label = opt.labelKey ? t(opt.labelKey) : (opt.label ?? String(opt.value));
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active ? 'true' : 'false'}
            className={[
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
              active
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white dark:bg-ink-700 text-ink-700 dark:text-white border-ink-100 dark:border-ink-700 hover:border-brand-400',
            ].join(' ')}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
