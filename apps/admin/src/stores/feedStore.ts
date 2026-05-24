// Feed store — server is the source of truth. The admin POSTs new posts to
// /api/v1/posts; the feed-hub broadcasts `feed.item.created` over WS to all
// connected clients (including the publisher). This store is a thin local
// cache that gets hydrated from the WS `snapshot` frame on connect, then
// kept in sync by `feed.item.created` / `feed.item.deleted` events.
//
// localStorage persistence is kept as an offline buffer only — values get
// overwritten by the next snapshot. If the user opens the admin offline,
// they'll at least see the last-known state until the WS reconnects.
//
// IMPORTANT: keep selectors stable — never `.filter()`/`.map()` inside a
// `useStore((s) => …)` call. (See [[feedback-zustand-selectors]].)

import { create } from 'zustand';

import {
  isMockMode,
  publishPost as apiPublishPost,
  publishReel as apiPublishReel,
  removeItem as apiRemoveItem,
} from '@/lib/api';
import { SEED_FEED } from '@/lib/seed';
import type { AdminFeedItem, AdminPost, AdminReel } from '@/lib/types';

const STORAGE_KEY = 'stitch.admin.feed';

function load(): AdminFeedItem[] {
  if (typeof localStorage === 'undefined') return SEED_FEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return isMockMode ? SEED_FEED : [];
    const parsed = JSON.parse(raw) as AdminFeedItem[];
    return Array.isArray(parsed) ? parsed : SEED_FEED;
  } catch {
    return SEED_FEED;
  }
}

function persist(items: AdminFeedItem[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // quota / private mode — silent
  }
}

function genLocalId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export type NewPostInput = Omit<AdminPost, 'id' | 'publishedAt' | 'status'> & {
  status?: AdminPost['status'];
};
export type NewReelInput = Omit<AdminReel, 'id' | 'publishedAt' | 'status'> & {
  status?: AdminReel['status'];
};

interface FeedState {
  items: AdminFeedItem[];
  connected: boolean;
  setItems: (items: AdminFeedItem[]) => void;
  receiveItem: (item: AdminFeedItem) => void;
  receiveDelete: (id: string) => void;
  setConnected: (open: boolean) => void;
  publishPost: (input: NewPostInput) => Promise<AdminPost>;
  publishReel: (input: NewReelInput) => Promise<AdminReel>;
  remove: (id: string) => Promise<void>;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  items: load(),
  connected: false,

  setItems: (items) => {
    persist(items);
    set({ items });
  },

  receiveItem: (item) => {
    if (get().items.some((i) => i.id === item.id)) return;
    const next = [item, ...get().items];
    persist(next);
    set({ items: next });
  },

  receiveDelete: (id) => {
    const next = get().items.filter((i) => i.id !== id);
    persist(next);
    set({ items: next });
  },

  setConnected: (open) => set({ connected: open }),

  publishPost: async (input) => {
    const payload: Omit<AdminPost, 'id' | 'publishedAt'> = {
      ...input,
      status: input.status ?? 'live',
    };
    if (isMockMode) {
      const local: AdminPost = {
        ...payload,
        id: genLocalId('p'),
        publishedAt: new Date().toISOString(),
      };
      const next = [local, ...get().items];
      persist(next);
      set({ items: next });
      return local;
    }
    const saved = await apiPublishPost(payload);
    // Optimistic add — WS echo will dedupe via id.
    get().receiveItem(saved);
    return saved;
  },

  publishReel: async (input) => {
    const payload: Omit<AdminReel, 'id' | 'publishedAt'> = {
      ...input,
      status: input.status ?? 'live',
    };
    if (isMockMode) {
      const local: AdminReel = {
        ...payload,
        id: genLocalId('r'),
        publishedAt: new Date().toISOString(),
      };
      const next = [local, ...get().items];
      persist(next);
      set({ items: next });
      return local;
    }
    const saved = await apiPublishReel(payload);
    get().receiveItem(saved);
    return saved;
  },

  remove: async (id) => {
    if (!isMockMode) {
      try {
        await apiRemoveItem(id);
      } catch {
        // ignore — fall through to local removal so the UI stays responsive
      }
    }
    get().receiveDelete(id);
  },
}));
