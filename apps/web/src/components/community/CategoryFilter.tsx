import { useTranslation } from 'react-i18next';

import { POST_CATEGORIES, type PostCategory } from '@/lib/mock/feedPosts';

export type FilterCategory = PostCategory | 'all' | 'saved';

interface Props {
  selected: FilterCategory;
  onSelect: (cat: FilterCategory) => void;
}

export function CategoryFilter({ selected, onSelect }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-row gap-2 overflow-x-auto no-scrollbar px-4 py-2">
      {POST_CATEGORIES.map((cat) => {
        const active = selected === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            aria-pressed={active ? 'true' : 'false'}
            className={[
              'flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-semibold border backdrop-blur-md transition-all duration-300 ease-smooth',
              active
                ? 'bg-gradient-to-br from-ink-900 to-ink-800 text-white border-ink-900 shadow-lg shadow-ink-900/25 scale-[1.03]'
                : 'bg-white/70 dark:bg-ink-700/70 text-ink-700 dark:text-white border-white/50 dark:border-ink-700 shadow-sm shadow-ink-900/5 hover:bg-white hover:scale-[1.02]',
            ].join(' ')}
          >
            {t(cat.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
