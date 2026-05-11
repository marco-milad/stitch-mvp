import { router, Stack } from 'expo-router';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/lib/theme';

export default function Notifications() {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-ink-900">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-ink-100 dark:border-ink-700">
        <Text className="text-xl font-semibold text-ink-900 dark:text-white">
          {t('notifications.title')}
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Close">
          <X color={colors.ink[700]} size={22} />
        </Pressable>
      </View>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-5xl mb-3">🔔</Text>
        <Text className="text-base text-ink-500">{t('notifications.empty')}</Text>
      </View>
    </SafeAreaView>
  );
}
