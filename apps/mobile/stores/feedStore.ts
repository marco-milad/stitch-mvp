// In-memory feed state (bookmarks, RSVPs, viewed stories).
// Resets on app reload — Week 2 wires this to AsyncStorage/MMKV + API sync.

import { create } from 'zustand';

interface FeedState {
  bookmarks: ReadonlySet<string>;
  rsvps: ReadonlySet<string>;
  viewedStories: ReadonlySet<string>;
  toggleBookmark: (postId: string) => void;
  toggleRsvp: (postId: string) => void;
  markStoryViewed: (storyId: string) => void;
  isBookmarked: (postId: string) => boolean;
  hasRsvped: (postId: string) => boolean;
  isStoryViewed: (storyId: string) => boolean;
}

function toggleInSet(set: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  bookmarks: new Set(),
  rsvps: new Set(),
  viewedStories: new Set(),
  toggleBookmark: (id) => set((s) => ({ bookmarks: toggleInSet(s.bookmarks, id) })),
  toggleRsvp: (id) => set((s) => ({ rsvps: toggleInSet(s.rsvps, id) })),
  markStoryViewed: (id) =>
    set((s) => {
      if (s.viewedStories.has(id)) return s;
      const next = new Set(s.viewedStories);
      next.add(id);
      return { viewedStories: next };
    }),
  isBookmarked: (id) => get().bookmarks.has(id),
  hasRsvped: (id) => get().rsvps.has(id),
  isStoryViewed: (id) => get().viewedStories.has(id),
}));
