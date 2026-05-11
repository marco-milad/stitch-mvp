import { router, Stack } from 'expo-router';
import { Camera, ClipboardList, QrCode, UserPlus, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/lib/theme';

interface QrAction {
  key: string;
  i18n: string;
  icon: React.ComponentType<{ color: string; size: number }>;
}

const ACTIONS: QrAction[] = [
  { key: 'myQr', i18n: 'qr.myQr', icon: QrCode },
  { key: 'guestPass', i18n: 'qr.guestPass', icon: UserPlus },
  { key: 'scan', i18n: 'qr.scan', icon: Camera },
  { key: 'activity', i18n: 'qr.activity', icon: ClipboardList },
];

export default function QrIndex() {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-ink-900">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-ink-100 dark:border-ink-700">
        <Text className="text-xl font-semibold text-ink-900 dark:text-white">{t('qr.title')}</Text>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Close">
          <X color={colors.ink[700]} size={22} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="flex-row flex-wrap -mx-2">
          {ACTIONS.map(({ key, i18n: i18nKey, icon: Icon }) => (
            <View key={key} className="w-1/2 px-2 mb-4">
              <Pressable className="aspect-square bg-brand-50 dark:bg-ink-700 rounded-2xl items-center justify-center">
                <Icon color={colors.brand[500]} size={40} />
                <Text className="mt-3 font-medium text-ink-900 dark:text-white">{t(i18nKey)}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
