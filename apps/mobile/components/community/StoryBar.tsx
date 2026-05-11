import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { FEED_STORIES, VISUAL_PALETTE, type FeedStory } from '@/lib/mock/feedStories';
import { useFeedStore } from '@/stores/feedStore';

import { Gradient } from './Gradient';

function StoryRing({ story, viewed }: { story: FeedStory; viewed: boolean }) {
  const palette = VISUAL_PALETTE[story.visual];
  if (viewed) {
    return (
      <View className="w-[68px] h-[68px] rounded-full bg-ink-100 dark:bg-ink-700 items-center justify-center">
        <View className="w-[60px] h-[60px] rounded-full bg-white dark:bg-ink-900 items-center justify-center">
          <View
            className="w-[54px] h-[54px] rounded-full items-center justify-center opacity-60"
            style={{ backgroundColor: palette.from }}
          >
            <Text className="text-2xl">{story.emoji}</Text>
          </View>
        </View>
      </View>
    );
  }
  return (
    <Gradient from="#F59E0B" to="#EC4899" angle={45} style={{ width: 68, height: 68 }} radius={34}>
      <View className="absolute inset-0 items-center justify-center">
        <View className="w-[60px] h-[60px] rounded-full bg-white dark:bg-ink-900 items-center justify-center">
          <Gradient
            from={palette.from}
            to={palette.to}
            style={{ width: 54, height: 54 }}
            radius={27}
          >
            <View className="absolute inset-0 items-center justify-center">
              <Text className="text-2xl">{story.emoji}</Text>
            </View>
          </Gradient>
        </View>
      </View>
    </Gradient>
  );
}

export function StoryBar() {
  const viewedStories = useFeedStore((s) => s.viewedStories);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
    >
      {FEED_STORIES.map((story) => {
        const viewed = viewedStories.has(story.id);
        return (
          <Pressable
            key={story.id}
            onPress={() => router.push({ pathname: '/story/[id]', params: { id: story.id } })}
            accessibilityRole="button"
            accessibilityLabel={`Story: ${story.label}`}
            className="items-center mx-1.5"
            style={{ width: 76 }}
          >
            <StoryRing story={story} viewed={viewed} />
            <Text className="text-[10px] mt-1.5 text-ink-700 dark:text-white" numberOfLines={1}>
              {story.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
