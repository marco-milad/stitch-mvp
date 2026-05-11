import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/TopBar';

export default function Community() {
  const { t } = useTranslation();
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-ink-900">
      <TopBar title={t('community.title')} />
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-base text-ink-500 text-center">{t('community.comingSoon')}</Text>
      </View>
    </SafeAreaView>
  );
}
