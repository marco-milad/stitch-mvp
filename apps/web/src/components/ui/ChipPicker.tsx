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
              'px-4 py-2 rounded-2xl text-xs font-semibold border backdrop-blur-md transition-all duration-300 ease-smooth',
              active
                ? 'bg-gradient-to-br from-ink-900 to-ink-800 text-white border-ink-900 shadow-lg shadow-ink-900/25 scale-[1.03]'
                : 'bg-white/70 dark:bg-ink-700/70 text-ink-700 dark:text-white border-white/50 dark:border-ink-700 shadow-sm shadow-ink-900/5 hover:bg-white hover:scale-[1.02]',
            ].join(' ')}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
