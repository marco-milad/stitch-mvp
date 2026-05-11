import { FlashList } from '@shopify/flash-list';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryFilter, type FilterCategory } from '@/components/community/CategoryFilter';
import { PostCard } from '@/components/community/PostCard';
import { ReelCard } from '@/components/community/ReelCard';
import { StoryBar } from '@/components/community/StoryBar';
import { TopBar } from '@/components/TopBar';
import { FEED_POSTS, type FeedPost } from '@/lib/mock/feedPosts';
import { FEED_REELS, type FeedReel } from '@/lib/mock/feedReels';
import { useFeedStore } from '@/stores/feedStore';

type FeedItem =
  | FeedPost
  | FeedReel
  | { id: string; kind: 'header' }
  | { id: string; kind: 'filter' };

/**
 * Interleaves posts and reels (pattern: 2 posts → 1 reel → repeat). The pinned
 * post always lands first regardless of category.
 */
function interleave(posts: FeedPost[], reels: FeedReel[]): Array<FeedPost | FeedReel> {
  const result: Array<FeedPost | FeedReel> = [];
  const pinned = posts.filter((p) => p.pinned);
  const rest = posts.filter((p) => !p.pinned);
  result.push(...pinned);

  const postsQueue = [...rest];
  const reelsQueue = [...reels];
  while (postsQueue.length || reelsQueue.length) {
    if (postsQueue.length) result.push(postsQueue.shift()!);
    if (postsQueue.length) result.push(postsQueue.shift()!);
    if (reelsQueue.length) result.push(reelsQueue.shift()!);
  }
  return result;
}

export default function Community() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterCategory>('all');
  const bookmarks = useFeedStore((s) => s.bookmarks);

  const items: FeedItem[] = useMemo(() => {
    let posts = FEED_POSTS;
    let reels = FEED_REELS;

    if (filter === 'saved') {
      posts = FEED_POSTS.filter((p) => bookmarks.has(p.id));
      reels = []; // saved view is posts only
    } else if (filter !== 'all') {
      posts = FEED_POSTS.filter((p) => p.cat === filter);
      reels = FEED_REELS.filter((r) => r.cat === filter);
    }

    const merged = interleave(posts, reels);
    return [
      { id: '__header', kind: 'header' as const },
      { id: '__filter', kind: 'filter' as const },
      ...merged,
    ];
  }, [filter, bookmarks]);

  const getItemType = (item: FeedItem) => item.kind;

  const renderItem = ({ item }: { item: FeedItem }) => {
    switch (item.kind) {
      case 'header':
        return <StoryBar />;
      case 'filter':
        return <CategoryFilter selected={filter} onSelect={setFilter} />;
      case 'post':
        return <PostCard post={item} />;
      case 'reel':
        return <ReelCard reel={item} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-ink-50 dark:bg-ink-900">
      <TopBar title={t('community.title')} unreadCount={3} />

      {items.length <= 2 ? (
        <View className="flex-1">
          <StoryBar />
          <CategoryFilter selected={filter} onSelect={setFilter} />
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-5xl mb-3">🔖</Text>
            <Text className="text-base text-ink-500 text-center">
              {filter === 'saved'
                ? 'Nothing saved yet — tap the bookmark icon on any post.'
                : 'Nothing in this category yet.'}
            </Text>
          </View>
        </View>
      ) : (
        <FlashList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          getItemType={getItemType}
          estimatedItemSize={400}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
