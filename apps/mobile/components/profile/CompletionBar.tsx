import { Text, View } from 'react-native';

import { Gradient } from '@/components/community/Gradient';

interface Props {
  percent: number; // 0–100
  doneCount: number;
  totalCount: number;
}

export function CompletionBar({ percent, doneCount, totalCount }: Props) {
  return (
    <View className="mx-4 my-3 p-4 bg-white dark:bg-ink-700 rounded-2xl border border-ink-100 dark:border-ink-700">
      <View className="flex-row items-end justify-between mb-2">
        <Text className="text-sm font-semibold text-ink-900 dark:text-white">
          Profile completion
        </Text>
        <Text className="text-[11px] text-ink-500 dark:text-ink-100">
          {doneCount} of {totalCount} · {percent}%
        </Text>
      </View>
      <View className="h-2 rounded-full overflow-hidden bg-ink-100 dark:bg-ink-900">
        <View style={{ width: `${percent}%` }} className="h-full">
          <Gradient from="#06B6D4" to="#7C3AED" angle={90} style={{ flex: 1 }} radius={4} />
        </View>
      </View>
    </View>
  );
}
