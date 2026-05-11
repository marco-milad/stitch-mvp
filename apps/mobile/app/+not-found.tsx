import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink-900 px-6">
        <Text className="text-3xl mb-2">🤔</Text>
        <Text className="text-lg text-ink-700 dark:text-white mb-6">
          This page doesn&apos;t exist.
        </Text>
        <Link href="/" className="text-brand-500 underline">
          Go home
        </Link>
      </View>
    </>
  );
}
