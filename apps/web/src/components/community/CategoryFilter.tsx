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
            className={
              active
                ? 'flex-shrink-0 px-3.5 py-1.5 rounded-full bg-brand-500 text-white text-xs font-semibold'
                : 'flex-shrink-0 px-3.5 py-1.5 rounded-full bg-white dark:bg-ink-700 border border-ink-100 dark:border-ink-700 text-ink-700 dark:text-white text-xs font-medium'
            }
          >
            {t(cat.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
