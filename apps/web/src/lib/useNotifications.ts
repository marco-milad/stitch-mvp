// Resident notifications hook bundle.
//   - `useMyNotifications()` — TanStack Query for /me/notifications kept
//     warm by a `notification.created` WebSocket subscription.
//   - `useUnreadCount()` — convenience selector for the TopBar bell dot.
//   - `useMarkAllRead()` — call when the user opens the Notifications
//     screen so the bell dot clears. Read state lives in localStorage
//     (`stitch.notifications.read`) — not synced server-side yet.

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  listMyNotifications,
  subscribeMyNotifications,
  type ResidentNotification,
} from '@/lib/residentApi';
import { MOCK_NOTIFICATIONS, withMockFallback } from '@/lib/residentApiFallbacks';

export const NOTIFICATIONS_KEY = ['me', 'notifications'] as const;
const READ_STORAGE_KEY = 'stitch.notifications.read';

function loadReadIds(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function persistReadIds(ids: Set<string>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // quota / private mode — silent
  }
}

// Module-level event emitter so multiple hooks (TopBar + Notifications
// screen) stay in sync without a Zustand store.
type Listener = (next: Set<string>) => void;
const listeners = new Set<Listener>();
let readIds: Set<string> = loadReadIds();

function setReadIds(next: Set<string>): void {
  readIds = next;
  persistReadIds(next);
  for (const l of listeners) l(next);
}

function useReadIds(): Set<string> {
  const [value, setValue] = useState(readIds);
  useEffect(() => {
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}

// ─── Public hooks ────────────────────────────────────────────────────────

// Module-scope live-flag so every consumer (TopBars, Notifications screen)
// can render a "LIVE" pill without opening its own WS subscription.
const liveListeners = new Set<(open: boolean) => void>();
let isLiveCurrent = false;

function publishLive(open: boolean): void {
  if (open === isLiveCurrent) return;
  isLiveCurrent = open;
  for (const l of liveListeners) l(open);
}

function useLiveFlag(): boolean {
  const [value, setValue] = useState(isLiveCurrent);
  useEffect(() => {
    liveListeners.add(setValue);
    return () => {
      liveListeners.delete(setValue);
    };
  }, []);
  return value;
}

/** Open the notifications WS once at app mount. Mount in `App.tsx` so the
 *  TopBar bell dot can stay live across every tab without each screen
 *  opening its own socket. */
export function useNotificationsSync(): void {
  const qc = useQueryClient();
  useEffect(() => {
    const sub = subscribeMyNotifications(
      (event) => {
        if (event.type === 'snapshot') {
          qc.setQueryData<ResidentNotification[]>(NOTIFICATIONS_KEY, event.items);
        } else if (event.type === 'notification.created') {
          qc.setQueryData<ResidentNotification[] | undefined>(NOTIFICATIONS_KEY, (prev) => {
            if (!prev) return [event.item];
            if (prev.some((n) => n.id === event.item.id)) return prev;
            return [event.item, ...prev];
          });
        }
      },
      {
        onStatusChange: publishLive,
        // WS gave up after MAX_WS_ATTEMPTS — make sure the cache has
        // something to render so the bell dot + Notifications screen
        // don't sit on a permanent skeleton.
        onPermanentFailure: () => {
          qc.setQueryData<ResidentNotification[] | undefined>(NOTIFICATIONS_KEY, (prev) =>
            prev && prev.length > 0 ? prev : MOCK_NOTIFICATIONS,
          );
        },
      },
    );
    return () => {
      sub.close();
      publishLive(false);
    };
  }, [qc]);
}

export interface UseMyNotificationsResult {
  notifications: ResidentNotification[];
  isLoading: boolean;
  isLive: boolean;
  readIds: Set<string>;
  unreadCount: number;
}

/** Read hook — relies on `useNotificationsSync` being mounted at the app
 *  root for live updates. TanStack Query dedupes the GET across callers,
 *  so this is cheap to call from multiple screens. */
export function useMyNotifications(): UseMyNotificationsResult {
  const query = useQuery<ResidentNotification[]>({
    queryKey: NOTIFICATIONS_KEY,
    // Wrap the real fetcher so a server-unreachable error degrades to
    // mock notifications instead of leaving the bell dot dark forever.
    queryFn: () => withMockFallback(listMyNotifications, MOCK_NOTIFICATIONS, 'listMyNotifications'),
    staleTime: 30_000,
  });

  const ids = useReadIds();
  const isLive = useLiveFlag();
  const notifications = query.data ?? [];
  const unreadCount = useMemo(
    () => notifications.reduce((acc, n) => (ids.has(n.id) ? acc : acc + 1), 0),
    [notifications, ids],
  );

  return {
    notifications,
    isLoading: query.isLoading,
    isLive,
    readIds: ids,
    unreadCount,
  };
}

export function useUnreadCount(): number {
  return useMyNotifications().unreadCount;
}

export function useMarkAllRead(): () => void {
  const { notifications } = useMyNotifications();
  return useCallback(() => {
    const next = new Set(readIds);
    for (const n of notifications) next.add(n.id);
    if (next.size === readIds.size) return;
    setReadIds(next);
  }, [notifications]);
}

/** Imperative variant for callers that have the ids on hand. Exposed so
 *  the Notifications screen can mark-as-read on mount without dragging in
 *  the full hook. */
export function markIdsRead(ids: string[]): void {
  const next = new Set(readIds);
  for (const id of ids) next.add(id);
  if (next.size === readIds.size) return;
  setReadIds(next);
}
