import { useAuth } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/TopBar';

/**
 * Discover tab adapts to user role:
 *   - Anonymous / prospect  → real-estate flows (tours, units, EOI)
 *   - Resident              → community flows (events, marketplace, services)
 *
 * Role lookup wires up in Week 2 (`useMe()` hook). For now we approximate:
 * signed-in == resident, signed-out == prospect.
 */
export default function Discover() {
  const { t } = useTranslation();
  const { isSignedIn } = useAuth();
  const message = isSignedIn ? t('discover.comingSoonResident') : t('discover.comingSoonProspect');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-ink-900">
      <TopBar title={t('discover.title')} />
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-base text-ink-500 text-center">{message}</Text>
      </View>
    </SafeAreaView>
  );
}
