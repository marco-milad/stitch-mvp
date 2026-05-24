import { ChevronRight, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { CategoryFilter, type FilterCategory } from '@/components/community/CategoryFilter';
import { PostCard } from '@/components/community/PostCard';
import { ReelCard } from '@/components/community/ReelCard';
import { StoryBar } from '@/components/community/StoryBar';
import { TopBar } from '@/components/TopBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { useLiveFeed } from '@/lib/useLiveFeed';
import { useUnreadCount } from '@/lib/useNotifications';
import { FEED_POSTS, type FeedPost } from '@/lib/mock/feedPosts';
import { FEED_REELS, type FeedReel } from '@/lib/mock/feedReels';
import { useFeedStore } from '@/stores/feedStore';

/**
 * Interleaves posts and reels (2 posts → 1 reel). Pinned posts come first.
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

export function Community() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterCategory>('all');
  const bookmarks = useFeedStore((s) => s.bookmarks);
  const unreadCount = useUnreadCount();
  const { posts: livePosts, reels: liveReels, isLive, isLoading: isLiveLoading } = useLiveFeed();

  const items = useMemo(() => {
    // Live items (admin-published) sit above the seeded mocks so they appear
    // first on the feed. Mocks are kept for demo continuity until the admin
    // backfills the seed catalog.
    const allPosts: FeedPost[] = [...livePosts, ...FEED_POSTS];
    const allReels: FeedReel[] = [...liveReels, ...FEED_REELS];
    let posts = allPosts;
    let reels = allReels;

    if (filter === 'saved') {
      posts = allPosts.filter((p) => bookmarks.has(p.id));
      reels = [];
    } else if (filter !== 'all') {
      posts = allPosts.filter((p) => p.cat === filter);
      reels = allReels.filter((r) => r.cat === filter);
    }
    return interleave(posts, reels);
  }, [filter, bookmarks, livePosts, liveReels]);

  return (
    <>
      <TopBar title={t('community.title')} unreadCount={unreadCount} />
      {isLive && (
        <div className="px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            Live feed
          </span>
        </div>
      )}
      <StoryBar />

      {/* Find Neighbors entry — directory of residents in the compound */}
      <button
        type="button"
        onClick={() => navigate('/community/neighbors')}
        className="mx-3 my-2 w-[calc(100%-1.5rem)] flex flex-row items-center gap-3 bg-gradient-to-r from-brand-500 to-accent rounded-2xl p-3 text-start text-white active:scale-[0.99] transition-transform"
      >
        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
          <Users size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold leading-tight">{t('neighbors.entry.title')}</p>
          <p className="text-[11px] text-white/85 leading-tight truncate">
            {t('neighbors.entry.subtitle')}
          </p>
        </div>
        <ChevronRight size={18} className="text-white/85 flex-shrink-0 rtl:rotate-180" />
      </button>

      <CategoryFilter selected={filter} onSelect={setFilter} />

      {isLiveLoading && items.length === 0 ? (
        <FeedSkeleton />
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          <span className="text-5xl mb-3">🔖</span>
          <p className="text-base text-ink-500 text-center">
            {filter === 'saved'
              ? 'Nothing saved yet — tap the bookmark icon on any post.'
              : 'Nothing in this category yet.'}
          </p>
        </div>
      ) : (
        <div className="pb-6">
          {items.map((item) =>
            item.kind === 'post' ? (
              <PostCard key={item.id} post={item} />
            ) : (
              <ReelCard key={item.id} reel={item} />
            ),
          )}
        </div>
      )}
    </>
  );
}

function FeedSkeleton() {
  return (
    <div className="pb-6 px-4 pt-3 flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-ink-700 rounded-2xl p-4 border border-ink-100 dark:border-ink-700 flex flex-col gap-3"
        >
          <div className="flex flex-row items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
          <Skeleton className="h-44 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
