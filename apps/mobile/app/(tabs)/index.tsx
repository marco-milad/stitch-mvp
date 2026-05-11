import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/TopBar';

export default function Home() {
  const { t } = useTranslation();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-ink-900">
      <TopBar title={t('app.name')} unreadCount={3} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text className="text-2xl font-semibold text-ink-900 dark:text-white mb-2">
          {t('home.greeting')}
        </Text>
        <Text className="text-base text-ink-500 mb-6">{t('home.comingSoon')}</Text>

        <View className="bg-brand-50 dark:bg-ink-700 rounded-2xl p-5 mb-4">
          <Text className="text-lg font-semibold text-ink-900 dark:text-white mb-1">
            🏊 Pool party Friday
          </Text>
          <Text className="text-sm text-ink-500 dark:text-ink-100">
            8 PM · Main Pool · RSVP from Community
          </Text>
        </View>

        <View className="bg-ink-50 dark:bg-ink-700 rounded-2xl p-5">
          <Text className="text-lg font-semibold text-ink-900 dark:text-white mb-1">
            🛠 AC technician
          </Text>
          <Text className="text-sm text-ink-500 dark:text-ink-100">
            Wednesday between 10 AM and noon
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
