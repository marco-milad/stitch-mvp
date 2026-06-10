// Resident notifications hook bundle.
//
//   - `useMyNotifications()` — TanStack Query for /me/notifications,
//     polled every 5 s.
//   - `useUnreadCount()` — convenience selector for the bell badge.
//   - `useMarkAllRead()` — POST /me/notifications/read-all, then
//     invalidate so the badge clears across every consumer.
//   - `useNewNotificationsHandler(callback)` — fires `callback` with
//     each notification that wasn't in the previous poll. Drives the
//     floating toast host without bolting another fetch onto the bell.
//
// Architectural note: notifications were previously WS-pushed; the WS
// flapped during Clerk dev-key session hiccups and 5 s polling gives
// equivalent UX for notification-shaped traffic at a fraction of the
// complexity. The backend WS endpoint stays in place for future
// opt-in surfaces. Read state was previously localStorage-only; it's
// now server-driven (notifications.read_at) so the badge stays
// consistent across devices.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import {
  listMyNotifications,
  markAllNotificationsRead,
  type ResidentNotification,
} from '@/lib/residentApi';
import { MOCK_NOTIFICATIONS, withMockFallback } from '@/lib/residentApiFallbacks';
import { residentQueryOptions } from '@/lib/useResidentQuery';

export const NOTIFICATIONS_KEY = ['me', 'notifications'] as const;

export interface UseMyNotificationsResult {
  notifications: ResidentNotification[];
  isLoading: boolean;
  /** Always false now that the WS is gone. Retained on the return shape
   *  so callers that previously rendered a LIVE pill compile without
   *  changes; remove on the next round of cleanup if no consumer reads it. */
  isLive: boolean;
  unreadCount: number;
}

/** Mount once at the app root so the notifications query is active
 *  before any screen reads it — that way the bell badge is warm on
 *  first paint of every tab. TanStack Query deduplicates the underlying
 *  GET across every consumer of `useMyNotifications`. */
export function useNotificationsSync(): void {
  useMyNotifications();
}

/** Read hook — polls /me/notifications every 5 s. */
export function useMyNotifications(): UseMyNotificationsResult {
  const query = useQuery<ResidentNotification[]>({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: () => withMockFallback(listMyNotifications, MOCK_NOTIFICATIONS, 'listMyNotifications'),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    staleTime: 0,
    ...residentQueryOptions<ResidentNotification[]>(),
  });

  const notifications = query.data ?? [];
  const unreadCount = useMemo(
    () => notifications.reduce((acc, n) => (n.isRead ? acc : acc + 1), 0),
    [notifications],
  );

  return {
    notifications,
    isLoading: query.isLoading,
    isLive: false,
    unreadCount,
  };
}

export function useUnreadCount(): number {
  return useMyNotifications().unreadCount;
}

export function useMarkAllRead(): () => void {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      // Pull a fresh snapshot — the rows we just flipped will arrive
      // with isRead=true and the badge clears in the next render.
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
  // Stable identity so callers that wire this to an onClick don't churn.
  return useMemo(() => () => mutation.mutate(), [mutation]);
}

/** Subscribe to "new notification arrived since the last poll" events.
 *  Calls `onArrival` once per fresh id with the notification payload.
 *  Designed to drive a floating toast host without adding a second
 *  fetch — piggybacks on the same 5 s poll the bell uses.
 *
 *  Implementation notes:
 *    - First poll never fires the callback — that initial snapshot is
 *      historical context, not "new arrivals".
 *    - Compares against the previous poll's id set, not against
 *      `readIds`, so a user who marks-all-read still sees toasts for
 *      notifications that land afterward.
 */
export function useNewNotificationsHandler(onArrival: (n: ResidentNotification) => void): void {
  const { notifications } = useMyNotifications();
  const seenRef = useRef<Set<string> | null>(null);
  // Pin the handler ref so we don't re-run the effect when the parent
  // re-creates the callback inline.
  const callbackRef = useRef(onArrival);
  callbackRef.current = onArrival;

  useEffect(() => {
    if (seenRef.current === null) {
      seenRef.current = new Set(notifications.map((n) => n.id));
      return;
    }
    const seen = seenRef.current;
    for (const n of notifications) {
      if (!seen.has(n.id)) {
        seen.add(n.id);
        // Only fire on actually unread items so a backfill from another
        // device (which would arrive already-read) doesn't trigger a
        // surprise toast.
        if (!n.isRead) callbackRef.current(n);
      }
    }
  }, [notifications]);
}
