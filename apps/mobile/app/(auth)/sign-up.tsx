import { useSignUp } from '@clerk/clerk-expo';
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

export default function SignUp() {
  const { t } = useTranslation();
  const { signUp, setActive, isLoaded } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingCode, setPendingCode] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!isLoaded) return;
    setError(null);
    setSubmitting(true);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingCode(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onVerify = async () => {
    if (!isLoaded) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/');
      } else {
        setError('Verification incomplete — try again');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
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
        <Text className="text-3xl font-bold text-ink-900 dark:text-white mb-6">
          {t('auth.signUpTitle')}
        </Text>

        {!pendingCode ? (
          <>
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
          </>
        ) : (
          <>
            <Text className="text-ink-500 mb-3">Enter the 6-digit code we emailed you.</Text>
            <TextInput
              placeholder="123456"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              className="border border-ink-100 dark:border-ink-700 rounded-xl px-4 py-3 mb-3 text-ink-900 dark:text-white text-center text-2xl tracking-widest"
            />
          </>
        )}

        {error && <Text className="text-red-500 text-sm mb-3">{error}</Text>}

        <Pressable
          onPress={pendingCode ? onVerify : onSubmit}
          disabled={submitting}
          className="bg-brand-500 disabled:bg-ink-400 rounded-xl py-3.5 items-center"
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold">{t('auth.submit')}</Text>
          )}
        </Pressable>

        <Link href="/(auth)/sign-in" asChild>
          <Pressable className="mt-4 items-center">
            <Text className="text-brand-500">{t('auth.switchToSignIn')}</Text>
          </Pressable>
        </Link>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
