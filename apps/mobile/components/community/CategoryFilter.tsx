import { Pressable, ScrollView, Text } from 'react-native';

import { POST_CATEGORIES, type PostCategory } from '@/lib/mock/feedPosts';

export type FilterCategory = PostCategory | 'all' | 'saved';

interface Props {
  selected: FilterCategory;
  onSelect: (cat: FilterCategory) => void;
}

export function CategoryFilter({ selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
    >
      {POST_CATEGORIES.map((cat) => {
        const active = selected === cat.id;
        return (
          <Pressable
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            accessibilityRole="button"
            accessibilityState={active ? { selected: true } : undefined}
            className={
              active
                ? 'px-3.5 py-1.5 rounded-full bg-brand-500'
                : 'px-3.5 py-1.5 rounded-full bg-white dark:bg-ink-700 border border-ink-100 dark:border-ink-700'
            }
          >
            <Text
              className={
                active
                  ? 'text-white text-xs font-semibold'
                  : 'text-ink-700 dark:text-white text-xs font-medium'
              }
            >
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
