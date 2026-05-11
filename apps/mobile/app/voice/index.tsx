import { router } from 'expo-router';
import { Mic, X } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/lib/theme';

/**
 * Voice screen — basic pulsing orb. Tapping the orb will open the WebSocket
 * voice session in Week 2; for Week 1 this is a visual placeholder migrated
 * from the prototype's canvas-based orb.
 */
export default function VoiceScreen() {
  const { t } = useTranslation();
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.15, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <SafeAreaView className="flex-1 bg-ink-900">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-xl font-semibold text-white">{t('voice.title')}</Text>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Close">
          <X color={colors.white} size={22} />
        </Pressable>
      </View>
      <View className="flex-1 items-center justify-center">
        <Animated.View
          style={[orbStyle]}
          className="w-48 h-48 rounded-full bg-brand-500 items-center justify-center"
        >
          <View className="w-32 h-32 rounded-full bg-brand-400 items-center justify-center">
            <Mic color={colors.white} size={48} />
          </View>
        </Animated.View>
        <Text className="text-white text-base mt-8">{t('voice.tapToTalk')}</Text>
      </View>
    </SafeAreaView>
  );
}
