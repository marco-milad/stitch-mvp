// Live-feed client for the resident app: GET /posts on mount, then a long-
// lived WS subscription that invalidates the TanStack Query cache whenever
// the admin publishes/retracts something. Items are mapped from the
// server's `AdminFeedItem` shape into the existing `FeedPost`/`FeedReel`
// shapes the Community screen already renders, so we don't have to touch
// PostCard or ReelCard.

import type { FeedPost, PostAuthor, PostCategory } from './mock/feedPosts';
import type { FeedReel } from './mock/feedReels';
import type { StoryVisual } from './mock/feedStories';

const RAW_API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
// Tolerate both base URLs that include `/api/v1` and those that don't.
const API_BASE = RAW_API.replace(/\/api\/v1\/?$/, '');
const WS_BASE =
  import.meta.env.VITE_WS_URL ?? import.meta.env.VITE_API_WS_URL ?? 'ws://localhost:8000';

export const POSTS_URL = `${API_BASE}/api/v1/posts`;
export const POSTS_WS_URL = `${WS_BASE}/api/v1/posts/stream`;

// ─── Server payload shapes (loose: avoids pulling zod for the read path) ──

interface ServerPostSlide {
  bg: string;
  emoji?: string | null;
  title: string;
  sub?: string | null;
  imageUrl?: string | null;
}

interface ServerPost {
  id: string;
  kind: 'post';
  category: string;
  caption: string;
  slides: ServerPostSlide[];
  pinned: boolean;
  isEvent: boolean;
  status: 'draft' | 'scheduled' | 'live';
  publishedAt: string;
  authorName: string;
}

interface ServerReel {
  id: string;
  kind: 'reel';
  category: string;
  title: string;
  description: string;
  visualKind: StoryVisual;
  status: 'draft' | 'scheduled' | 'live';
  publishedAt: string;
  authorName: string;
}

type ServerFeedItem = ServerPost | ServerReel;

// ─── Adapters → existing UI types ───────────────────────────────────────

const MGMT_AUTHOR: PostAuthor = {
  name: 'Madinet Masr Management',
  initials: 'MM',
  role: 'management',
  verified: true,
  avatarFrom: '#06B6D4',
  avatarTo: '#0891B2',
};

const VALID_CATS = new Set<PostCategory>([
  'announcements',
  'general',
  'marketplace',
  'lostFound',
  'sports',
  'events',
]);

function mapCategory(c: string): PostCategory {
  // Server uses the four `@stitch/types` categories; map them onto the
  // richer client taxonomy. Unknown values land in 'general' as a safe
  // default that's always visible in the All filter.
  switch (c) {
    case 'events':
      return 'events';
    case 'announcements':
      return 'announcements';
    case 'news':
      return 'general';
    case 'community':
      return 'general';
    default:
      return (VALID_CATS.has(c as PostCategory) ? c : 'general') as PostCategory;
  }
}

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function adaptPost(p: ServerPost): FeedPost {
  return {
    id: p.id,
    kind: 'post',
    cat: mapCategory(p.category),
    author: MGMT_AUTHOR,
    when: relative(p.publishedAt),
    caption: p.caption,
    slides: p.slides.map((s) => ({
      bg: s.bg,
      emoji: s.emoji ?? '📣',
      title: s.title,
      sub: s.sub ?? '',
      ...(s.imageUrl ? { imageUrl: s.imageUrl } : {}),
    })),
    likes: 0,
    comments: 0,
    pinned: p.pinned,
    isEvent: p.isEvent,
  };
}

export function adaptReel(r: ServerReel): FeedReel {
  return {
    id: r.id,
    kind: 'reel',
    cat: mapCategory(r.category),
    when: relative(r.publishedAt),
    title: r.title,
    desc: r.description,
    visual: r.visualKind,
  };
}

export type LiveItem = { kind: 'post'; item: FeedPost } | { kind: 'reel'; item: FeedReel };

export function adaptItem(item: ServerFeedItem): LiveItem {
  return item.kind === 'reel'
    ? { kind: 'reel', item: adaptReel(item) }
    : { kind: 'post', item: adaptPost(item) };
}

// ─── HTTP fetch ─────────────────────────────────────────────────────────

export async function fetchLiveFeed(): Promise<LiveItem[]> {
  const res = await fetch(POSTS_URL);
  if (!res.ok) throw new Error(`GET /posts ${res.status}`);
  const data = (await res.json()) as { items: ServerFeedItem[] };
  return data.items.map(adaptItem);
}

// ─── WS subscription with backoff ───────────────────────────────────────

export type FeedEvent =
  | { type: 'snapshot'; items: ServerFeedItem[] }
  | { type: 'feed.item.created'; item: ServerFeedItem }
  | { type: 'feed.item.deleted'; id: string }
  | { type: 'pong' };

export interface FeedSubscription {
  close: () => void;
}

export function subscribeLiveFeed(
  onEvent: (event: FeedEvent) => void,
  onStatusChange?: (connected: boolean) => void,
): FeedSubscription {
  let socket: WebSocket | null = null;
  let closed = false;
  let backoff = 500;

  const connect = () => {
    if (closed) return;
    try {
      socket = new WebSocket(POSTS_WS_URL);
    } catch {
      schedule();
      return;
    }
    socket.onopen = () => {
      backoff = 500;
      onStatusChange?.(true);
    };
    socket.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data) as FeedEvent;
        onEvent(payload);
      } catch {
        // ignore non-JSON frames
      }
    };
    socket.onclose = () => {
      onStatusChange?.(false);
      if (!closed) schedule();
    };
    socket.onerror = () => {
      // onclose fires next
    };
  };

  const schedule = () => {
    setTimeout(connect, backoff);
    backoff = Math.min(backoff * 2, 30_000);
  };

  connect();

  return {
    close: () => {
      closed = true;
      socket?.close();
    },
  };
}
