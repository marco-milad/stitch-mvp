// Shared TanStack Query options for resident-scoped /me/* polling.
//
// Every list query on the resident side (maintenance tickets, service
// bookings, notifications) hits the same auth-sensitive HTTP path. When
// Clerk's SDK has a transient outage (CDN unreachable, DNS blocked,
// session refresh in flight), residentApi's http() helper throws an
// AuthRequiredError before the fetch ever fires.
//
// Without guardrails, TanStack Query's default retry behaviour would
// then:
//   1. Retry the query up to 3× per refetchInterval cycle.
//   2. Each retry runs through the same null-token guard and re-throws
//      AuthRequiredError instantly.
//   3. The query lands in an error state, the previous list disappears,
//      and the resident sees a blank screen until Clerk recovers.
//
// `residentQueryOptions` patches all three behaviours:
//
//   - `retry: false` for AuthRequiredError — never retry an auth failure
//     (no point, the token still isn't there).
//   - `retry: 1` for other errors (network, 5xx) — one quick retry, then
//     defer to the next refetchInterval tick.
//   - `placeholderData: keepPreviousData` so a transient auth blip
//     doesn't blank the list. The last successful payload keeps
//     rendering while the next poll resolves.
//
// The auth guard in residentApi.ts:107-112 is what ensures we don't
// fire unauthenticated POSTs; this file complements it on the read
// side.

import { keepPreviousData, type UseQueryOptions } from '@tanstack/react-query';

import { AuthRequiredError } from '@/lib/residentApi';

export function residentQueryOptions<T>(): Pick<
  UseQueryOptions<T>,
  'retry' | 'placeholderData' | 'refetchOnWindowFocus'
> {
  return {
    retry: (failureCount, error) => {
      // Auth failures never benefit from retry — the token isn't going
      // to materialize between attempts. Let the next refetchInterval
      // cycle try fresh.
      if (error instanceof AuthRequiredError) return false;
      // One quick retry for transient network / 5xx flakes.
      return failureCount < 1;
    },
    // Keep the last good list visible while a poll is in flight — even
    // through an auth blip — so the screen never blanks unexpectedly.
    placeholderData: keepPreviousData,
    // Don't re-fire on focus; refetchInterval handles freshness, and
    // focus-fire on top of polling causes double-requests right after
    // any tab switch.
    refetchOnWindowFocus: false,
  };
}
