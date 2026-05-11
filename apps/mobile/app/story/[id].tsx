import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Gradient } from '@/components/community/Gradient';
import { FEED_STORIES, VISUAL_PALETTE } from '@/lib/mock/feedStories';
import { useFeedStore } from '@/stores/feedStore';

const STORY_DURATION_MS = 4000;

/**
 * Instagram-style story viewer.
 * - Top progress bars (one per story) auto-fill over STORY_DURATION_MS
 * - Tap right half → next, tap left half → previous, swipe down or X → close
 */
export default function StoryViewer() {
  const params = useLocalSearchParams<{ id: string }>();
  const startIdx = Math.max(
    0,
    FEED_STORIES.findIndex((s) => s.id === params.id),
  );
  const [idx, setIdx] = useState(startIdx);
  const markStoryViewed = useFeedStore((s) => s.markStoryViewed);

  const story = FEED_STORIES[idx];
  const palette = useMemo(() => (story ? VISUAL_PALETTE[story.visual] : null), [story]);

  // Progress for the currently-displayed bar
  const progress = useSharedValue(0);

  const advance = (delta: number) => {
    const next = idx + delta;
    if (next < 0) {
      router.back();
      return;
    }
    if (next >= FEED_STORIES.length) {
      router.back();
      return;
    }
    setIdx(next);
  };

  useEffect(() => {
    if (!story) return;
    markStoryViewed(story.id);
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: STORY_DURATION_MS, easing: Easing.linear },
      (finished) => {
        if (finished) {
          // Tick to next story; runs on the JS thread via callback
          // (Reanimated's callback marshals back automatically for state updates).
          // We rely on the closure of `idx` so the next index is computed in the effect.
        }
      },
    );

    const timer = setTimeout(() => {
      advance(1);
    }, STORY_DURATION_MS);

    return () => {
      cancelAnimation(progress);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, story]);

  const activeBarStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  if (!story || !palette) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <Text className="text-white">Story not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <Gradient from={palette.from} to={palette.to} style={{ flex: 1 }}>
        <SafeAreaView edges={['top']} className="flex-1">
          {/* Progress bars */}
          <View className="flex-row px-3 pt-2 gap-1">
            {FEED_STORIES.map((_, i) => (
              <View
                key={i}
                className="flex-1 h-0.5 rounded-full overflow-hidden"
                style={{ backgroundColor: 'rgba(255,255,255,0.35)' }}
              >
                {i < idx && <View className="h-full bg-white" />}
                {i === idx && (
                  <Animated.View
                    style={[{ height: '100%', backgroundColor: '#fff' }, activeBarStyle]}
                  />
                )}
              </View>
            ))}
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-4 mt-3">
            <Text className="text-white font-semibold">{story.label}</Text>
            <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Close story">
              <X color="#fff" size={24} />
            </Pressable>
          </View>

          {/* Story content */}
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-9xl mb-6">{story.emoji}</Text>
            <Text className="text-white text-3xl font-extrabold mb-2 text-center">
              {story.title}
            </Text>
            <Text className="text-white/85 text-base text-center">{story.sub}</Text>
            <Text className="text-white/60 text-xs mt-6">{story.time}</Text>
          </View>

          {/* Tap zones */}
          <View className="absolute inset-0 flex-row" style={{ pointerEvents: 'box-none' }}>
            <Pressable
              className="flex-1"
              onPress={() => advance(-1)}
              accessibilityLabel="Previous story"
            />
            <Pressable
              className="flex-1"
              onPress={() => advance(1)}
              accessibilityLabel="Next story"
            />
          </View>
        </SafeAreaView>
      </Gradient>
    </View>
  );
}
