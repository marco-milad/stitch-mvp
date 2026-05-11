import { useSignIn } from '@clerk/clerk-expo';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignIn() {
  const { t } = useTranslation();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!isLoaded) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/');
      } else {
        setError('Additional steps required — finish the flow from a full client.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-ink-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 px-6 justify-center"
      >
        <Text className="text-3xl font-bold text-ink-900 dark:text-white mb-1">
          {t('auth.signInTitle')}
        </Text>
        <Text className="text-base text-ink-500 mb-8">{t('auth.signInSubtitle')}</Text>

        <TextInput
          placeholder={t('auth.email')}
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          className="border border-ink-100 dark:border-ink-700 rounded-xl px-4 py-3 mb-3 text-ink-900 dark:text-white"
        />
        <TextInput
          placeholder={t('auth.password')}
          placeholderTextColor="#94A3B8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          className="border border-ink-100 dark:border-ink-700 rounded-xl px-4 py-3 mb-3 text-ink-900 dark:text-white"
        />

        {error && <Text className="text-red-500 text-sm mb-3">{error}</Text>}

        <Pressable
          onPress={onSubmit}
          disabled={submitting || !email || !password}
          className="bg-brand-500 disabled:bg-ink-400 rounded-xl py-3.5 items-center"
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold">{t('auth.submit')}</Text>
          )}
        </Pressable>

        <Link href="/(auth)/sign-up" asChild>
          <Pressable className="mt-4 items-center">
            <Text className="text-brand-500">{t('auth.switchToSignUp')}</Text>
          </Pressable>
        </Link>

        <Pressable onPress={() => router.replace('/')} className="mt-6 items-center">
          <Text className="text-ink-500">{t('auth.skipForNow')}</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
