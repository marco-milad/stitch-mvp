import { router } from 'expo-router';
import { Bell, User } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

interface TopBarProps {
  title: string;
  /** When provided, shows a small unread indicator on the bell icon. */
  unreadCount?: number;
}

export function TopBar({ title, unreadCount }: TopBarProps) {
  return (
    <View className="flex-row items-center justify-between px-4 pt-2 pb-3 bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-700">
      <Text className="text-xl font-semibold text-ink-900 dark:text-white">{title}</Text>

      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.push('/notifications')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          className="relative w-10 h-10 items-center justify-center"
        >
          <Bell color={colors.ink[700]} size={22} />
          {unreadCount !== undefined && unreadCount > 0 && (
            <View className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-brand-500" />
          )}
        </Pressable>

        <Pressable
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Profile"
          className="w-9 h-9 rounded-full bg-ink-100 dark:bg-ink-700 items-center justify-center"
        >
          <User color={colors.ink[500]} size={18} />
        </Pressable>
      </View>
    </View>
  );
}
