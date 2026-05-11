import { Search, X } from 'lucide-react-native';
import { Pressable, TextInput, View } from 'react-native';

import { colors } from '@/lib/theme';

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search services…' }: Props) {
  return (
    <View className="mx-4 mt-2 mb-3 flex-row items-center bg-white dark:bg-ink-700 rounded-2xl px-3 py-2.5 border border-ink-100 dark:border-ink-700">
      <Search color={colors.ink[400]} size={18} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.ink[400]}
        autoCorrect={false}
        autoCapitalize="none"
        className="flex-1 mx-2 text-sm text-ink-900 dark:text-white"
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChange('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <X color={colors.ink[400]} size={16} />
        </Pressable>
      )}
    </View>
  );
}
