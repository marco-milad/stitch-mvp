// Resident notifications hook bundle.
//   - `useMyNotifications()` — TanStack Query for /me/notifications,
//     polled every 5 s so the bell dot stays current.
//   - `useUnreadCount()` — convenience selector for the TopBar bell dot.
//   - `useMarkAllRead()` — call when the user opens the Notifications
//     screen so the bell dot clears. Read state lives in localStorage
//     (`stitch.notifications.read`) — not synced server-side yet.
//
// Architectural note: this used to hold an open WebSocket subscription
// (`/me/notifications/stream`) for push-style updates. We dropped it
// because the WS was flapping during Clerk dev-key session hiccups and
// 5 s polling gives equivalent UX for notification-shaped traffic at
// a fraction of the complexity. The backend WS endpoint stays in place
// for future opt-in.

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { listMyNotifications, type ResidentNotification } from '@/lib/residentApi';
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

/** Mount once at the app root (App.tsx) so the notifications query is
 *  active before any screen reads it — that way the TopBar bell dot is
 *  warm on first paint of every tab. The query itself does the polling;
 *  this hook is just an activation handle.
 *
 *  Returning `void` keeps the call site (`<ShellRoute>`) trivially
 *  side-effecting. TanStack Query deduplicates the underlying GET across
 *  every consumer of `useMyNotifications`, so individual screens calling
 *  the hook again are free. */
export function useNotificationsSync(): void {
  useMyNotifications();
}

export interface UseMyNotificationsResult {
  notifications: ResidentNotification[];
  isLoading: boolean;
  /** Always false now that the WS is gone. Retained on the return shape
   *  so callers that previously rendered a LIVE pill compile without
   *  changes; remove on the next round of cleanup if no consumer reads it. */
  isLive: boolean;
  readIds: Set<string>;
  unreadCount: number;
}

/** Read hook — polls /me/notifications every 5 s. TanStack Query dedupes
 *  the GET across multiple callers, so screens that need notifications
 *  data (TopBar, Notifications screen) can call this freely without
 *  multiplying network traffic. */
export function useMyNotifications(): UseMyNotificationsResult {
  const query = useQuery<ResidentNotification[]>({
    queryKey: NOTIFICATIONS_KEY,
    // Wrap the real fetcher so a server-unreachable error degrades to
    // mock notifications instead of leaving the bell dot dark forever.
    queryFn: () => withMockFallback(listMyNotifications, MOCK_NOTIFICATIONS, 'listMyNotifications'),
    // 5 s polling replaces the WebSocket. Background-tab pausing keeps
    // hidden tabs cheap.
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });

  const ids = useReadIds();
  const notifications = query.data ?? [];
  const unreadCount = useMemo(
    () => notifications.reduce((acc, n) => (ids.has(n.id) ? acc : acc + 1), 0),
    [notifications, ids],
  );

  return {
    notifications,
    isLoading: query.isLoading,
    isLive: false,
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
