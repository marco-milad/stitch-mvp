import { useTranslation } from 'react-i18next';

import { SUGGESTION_CHIPS } from '@/lib/mock/voicePrompts';
import type { SuggestionChip } from '@/lib/schemas/voice';

interface Props {
  onPick: (chip: SuggestionChip) => void;
}

export function SuggestionChips({ onPick }: Props) {
  const { t } = useTranslation();
  return (
    <div className="-mx-1 px-1 flex flex-row gap-2 overflow-x-auto no-scrollbar pb-1">
      {SUGGESTION_CHIPS.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onPick(chip)}
          className="flex-shrink-0 inline-flex items-center gap-1.5 bg-white dark:bg-ink-700 border border-ink-100 dark:border-ink-700 hover:border-brand-400 active:scale-95 transition-all rounded-full px-3 py-1.5 text-xs font-semibold text-ink-900 dark:text-white"
        >
          <span className="text-base leading-none">{chip.emoji}</span>
          <span>{t(chip.labelKey)}</span>
        </button>
      ))}
    </div>
  );
}
