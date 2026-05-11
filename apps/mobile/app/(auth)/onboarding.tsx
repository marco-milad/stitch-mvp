import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Onboarding() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-ink-900">
      <View className="flex-1 px-6 items-center justify-center">
        <Text className="text-3xl font-bold mb-2 text-ink-900 dark:text-white">Welcome</Text>
        <Text className="text-base text-ink-500 mb-8 text-center">
          Onboarding flow lands in Week 2 — language pick, role confirmation, unit linking.
        </Text>
        <Pressable
          onPress={() => router.replace('/')}
          className="bg-brand-500 rounded-xl px-6 py-3"
        >
          <Text className="text-white font-semibold">Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
