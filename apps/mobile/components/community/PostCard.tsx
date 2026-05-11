import { Bookmark, BookmarkCheck, CheckCircle2, MessageSquare, Share2 } from 'lucide-react-native';
import { memo, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { FEED_SOURCE, type FeedPost } from '@/lib/mock/feedPosts';
import { colors } from '@/lib/theme';
import { useFeedStore } from '@/stores/feedStore';

const SCREEN_W = Dimensions.get('window').width;
const SLIDE_H = 220;

function PostCardImpl({ post }: { post: FeedPost }) {
  const [slideIdx, setSlideIdx] = useState(0);
  const slideW = SCREEN_W - 32; // matches outer padding 16px on each side
  const scrollRef = useRef<ScrollView>(null);

  const bookmarked = useFeedStore((s) => s.bookmarks.has(post.id));
  const rsvped = useFeedStore((s) => s.rsvps.has(post.id));
  const toggleBookmark = useFeedStore((s) => s.toggleBookmark);
  const toggleRsvp = useFeedStore((s) => s.toggleRsvp);

  const onSlideScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setSlideIdx(Math.round(x / slideW));
  };

  const cardBorder = post.pinned
    ? 'border-2 border-amber-400'
    : 'border border-ink-100 dark:border-ink-700';

  return (
    <View
      className={`mx-4 mb-4 bg-white dark:bg-ink-700 rounded-2xl overflow-hidden ${cardBorder}`}
    >
      {/* Pinned banner */}
      {post.pinned && (
        <View className="px-4 py-1.5 bg-amber-400 flex-row items-center">
          <Text className="text-[10px] font-bold text-ink-900 tracking-wide">
            📌 PINNED BY MANAGEMENT
          </Text>
        </View>
      )}

      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <View className="w-9 h-9 rounded-full bg-brand-500 items-center justify-center mr-3">
          <Text className="text-white text-xs font-bold">{FEED_SOURCE.initials}</Text>
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center">
            <Text
              className="text-sm font-semibold text-ink-900 dark:text-white mr-1"
              numberOfLines={1}
            >
              {FEED_SOURCE.name}
            </Text>
            {FEED_SOURCE.verified && (
              <CheckCircle2 color="#06B6D4" size={14} fill="#06B6D4" stroke="#fff" />
            )}
          </View>
          <Text className="text-[11px] text-ink-500 dark:text-ink-100">{post.when}</Text>
        </View>
      </View>

      {/* Slide carousel */}
      <View>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onSlideScroll}
          style={{ height: SLIDE_H }}
        >
          {post.slides.map((slide, i) => (
            <View
              key={i}
              style={{
                width: slideW,
                height: SLIDE_H,
                backgroundColor: slide.bg,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
              }}
            >
              <Text className="text-6xl mb-2">{slide.emoji}</Text>
              <Text className="text-white text-xl font-bold mb-1 text-center">{slide.title}</Text>
              <Text className="text-white/80 text-xs text-center">{slide.sub}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Slide dots */}
        {post.slides.length > 1 && (
          <View className="absolute bottom-3 left-0 right-0 flex-row justify-center">
            {post.slides.map((_, i) => (
              <View
                key={i}
                className="mx-0.5 rounded-full"
                style={{
                  width: i === slideIdx ? 18 : 6,
                  height: 6,
                  backgroundColor: i === slideIdx ? '#fff' : 'rgba(255,255,255,0.5)',
                }}
              />
            ))}
          </View>
        )}
      </View>

      {/* Actions row */}
      <View className="flex-row items-center px-4 py-2.5">
        <Pressable
          onPress={() => toggleBookmark(post.id)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
          className="mr-3"
        >
          {bookmarked ? (
            <BookmarkCheck color="#06B6D4" size={22} fill="#06B6D4" />
          ) : (
            <Bookmark color={colors.ink[500]} size={22} />
          )}
        </Pressable>
        <Pressable hitSlop={8} accessibilityLabel="Comments" className="mr-3">
          <MessageSquare color={colors.ink[500]} size={22} />
        </Pressable>
        <Pressable hitSlop={8} accessibilityLabel="Share" className="mr-3">
          <Share2 color={colors.ink[500]} size={22} />
        </Pressable>

        {post.isEvent && (
          <Pressable
            onPress={() => toggleRsvp(post.id)}
            className={`ml-auto px-4 py-1.5 rounded-full ${
              rsvped ? 'bg-emerald-500' : 'bg-brand-500'
            }`}
            accessibilityRole="button"
            accessibilityLabel={rsvped ? 'Cancel RSVP' : 'RSVP'}
          >
            <Text className="text-white text-xs font-bold">
              {rsvped ? "You're going ✓" : 'RSVP'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Caption */}
      <View className="px-4 pb-4">
        <Text className="text-sm text-ink-700 dark:text-white leading-5" numberOfLines={3}>
          {post.caption}
        </Text>
      </View>
    </View>
  );
}

export const PostCard = memo(PostCardImpl);
