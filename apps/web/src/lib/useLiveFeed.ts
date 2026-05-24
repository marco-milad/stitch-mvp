// React hook bundling the live-feed wiring:
//   1. `useQuery` fetches GET /posts on mount + on window focus.
//   2. A WS subscription invalidates that query whenever the admin
//      publishes or retracts. The hub also sends a `snapshot` frame on
//      connect, which we use to set the query data directly (one fewer
//      HTTP round-trip on reconnect).
//
// Returns the adapted items already split into posts + reels so the
// Community screen can drop them straight into its existing interleave
// pipeline.

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { adaptItem, fetchLiveFeed, subscribeLiveFeed, type LiveItem } from '@/lib/liveFeed';
import type { FeedPost } from '@/lib/mock/feedPosts';
import type { FeedReel } from '@/lib/mock/feedReels';

export const LIVE_FEED_KEY = ['liveFeed'] as const;

export interface UseLiveFeed {
  posts: FeedPost[];
  reels: FeedReel[];
  isLoading: boolean;
  isLive: boolean;
}

export function useLiveFeed(): UseLiveFeed {
  const qc = useQueryClient();
  const [isLive, setIsLive] = useState(false);

  const query = useQuery<LiveItem[]>({
    queryKey: LIVE_FEED_KEY,
    queryFn: fetchLiveFeed,
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    const sub = subscribeLiveFeed((event) => {
      if (event.type === 'snapshot') {
        qc.setQueryData<LiveItem[]>(LIVE_FEED_KEY, event.items.map(adaptItem));
      } else if (event.type === 'feed.item.created' || event.type === 'feed.item.deleted') {
        qc.invalidateQueries({ queryKey: LIVE_FEED_KEY });
      }
    }, setIsLive);
    return () => sub.close();
  }, [qc]);

  const { posts, reels } = useMemo(() => {
    const ps: FeedPost[] = [];
    const rs: FeedReel[] = [];
    for (const li of query.data ?? []) {
      if (li.kind === 'post') ps.push(li.item);
      else rs.push(li.item);
    }
    return { posts: ps, reels: rs };
  }, [query.data]);

  return {
    posts,
    reels,
    isLoading: query.isLoading,
    isLive,
  };
}
