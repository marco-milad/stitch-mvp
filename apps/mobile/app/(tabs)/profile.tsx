import { useAuth, useUser } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/TopBar';

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();

  const toggleLanguage = () => {
    const next = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(next);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-ink-900">
      <TopBar title={t('profile.title')} />
      <View className="flex-1 px-6 pt-4">
        <Text className="text-lg text-ink-900 dark:text-white mb-6">
          {isSignedIn
            ? t('profile.signedInAs', { email: user?.primaryEmailAddress?.emailAddress ?? '' })
            : t('profile.anonymous')}
        </Text>

        <Pressable
          onPress={toggleLanguage}
          className="bg-ink-100 dark:bg-ink-700 rounded-xl py-3.5 items-center mb-3"
        >
          <Text className="font-medium text-ink-900 dark:text-white">
            {i18n.language === 'ar' ? 'Switch to English' : 'تغيير اللغة للعربي'}
          </Text>
        </Pressable>

        {isSignedIn ? (
          <Pressable
            onPress={() => signOut()}
            className="bg-red-500 rounded-xl py-3.5 items-center"
          >
            <Text className="text-white font-semibold">{t('profile.signOut')}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.push('/(auth)/sign-in')}
            className="bg-brand-500 rounded-xl py-3.5 items-center"
          >
            <Text className="text-white font-semibold">{t('profile.signIn')}</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
