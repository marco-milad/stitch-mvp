// Mock fallback data + helpers for `residentApi`.
//
// When the API server is unreachable (refused connection, DNS failure,
// timeout, or a permanently-failed WS), the consumer hooks fall back to
// the data here so the dashboard renders something instead of hanging
// on a permanent skeleton or an empty error state.
//
// The shapes match the real API exactly so React Query caches + UI
// components don't know the difference. When the server comes back,
// the next successful fetch replaces the mock.

import type { MaintenanceTicket, ResidentNotification, TicketTechnician } from '@/lib/residentApi';
import { NetworkError } from '@/lib/residentApi';

// ─── Mock tickets ─────────────────────────────────────────────────────────

const MOCK_OPENED_AT = '2026-05-22T09:14:00Z';
const MOCK_UPDATED_AT = '2026-05-24T16:02:00Z';

export const MOCK_TICKETS: MaintenanceTicket[] = [
  {
    id: 'sr-mock-1',
    residentName: 'Sara Hassan',
    unit: 'Villa 12',
    category: 'ac',
    urgency: 'urgent',
    title: 'AC dripping in living room',
    summary: 'Indoor unit dripping water onto the floor; pan likely full.',
    status: 'in_progress',
    assigneeId: 't-1',
    openedAt: MOCK_OPENED_AT,
    updatedAt: MOCK_UPDATED_AT,
  },
  {
    id: 'sr-mock-2',
    residentName: 'Sara Hassan',
    unit: 'Villa 12',
    category: 'plumbing',
    urgency: 'priority',
    title: 'Kitchen sink slow drain',
    summary: 'Drain backed up over the weekend, getting worse.',
    status: 'pending',
    assigneeId: null,
    openedAt: '2026-05-23T11:40:00Z',
    updatedAt: '2026-05-23T11:40:00Z',
  },
  {
    id: 'sr-mock-3',
    residentName: 'Sara Hassan',
    unit: 'Villa 12',
    category: 'electrical',
    urgency: 'routine',
    title: 'Bathroom light flickers',
    summary: 'Flickers when fan turns on. Maybe a loose connection.',
    status: 'resolved',
    assigneeId: 't-3',
    openedAt: '2026-05-10T08:20:00Z',
    updatedAt: '2026-05-14T15:55:00Z',
  },
];

export const MOCK_TECHNICIANS: TicketTechnician[] = [
  { id: 't-1', name: 'Mahmoud Sayed', specialty: 'ac', load: 3 },
  { id: 't-2', name: 'Sherif Helmy', specialty: 'plumbing', load: 1 },
  { id: 't-3', name: 'Hassan Adel', specialty: 'electrical', load: 2 },
];

// ─── Mock notifications ────────────────────────────────────────────────────

export const MOCK_NOTIFICATIONS: ResidentNotification[] = [
  {
    id: 'notif-mock-1',
    kind: 'ticket_dispatched',
    title: {
      en: 'Technician on the way',
      ar: 'الفني في الطريق',
    },
    body: {
      en: 'Mahmoud Sayed has been dispatched for your AC ticket.',
      ar: 'تم تكليف محمود سيد بطلب التكييف.',
    },
    createdAt: '2026-05-24T16:02:00Z',
    link: '/services/requests',
  },
  {
    id: 'notif-mock-2',
    kind: 'ticket_created',
    title: {
      en: 'Ticket received',
      ar: 'تم استلام الطلب',
    },
    body: {
      en: "We've opened your kitchen-sink ticket. Average response: 4 h.",
      ar: 'تم فتح طلب صيانة المطبخ. متوسط الاستجابة: ٤ ساعات.',
    },
    createdAt: '2026-05-23T11:40:00Z',
    link: '/services/requests',
  },
  {
    id: 'notif-mock-3',
    kind: 'ticket_resolved',
    title: {
      en: 'Ticket resolved',
      ar: 'تم حل الطلب',
    },
    body: {
      en: 'Bathroom light flicker — marked resolved by ops.',
      ar: 'مشكلة لمبة الحمام - تم حلها.',
    },
    createdAt: '2026-05-14T15:55:00Z',
    link: '/services/requests',
  },
];

// ─── Tiny "is this a network error?" helper ───────────────────────────────

/** True when the thrown error is the typed NetworkError we emit on
 *  refused / timed-out fetches, OR a generic TypeError that fetch
 *  throws on hard network failures. Anything else (HTTP 4xx/5xx
 *  response, parse error, etc.) is NOT a network problem and should
 *  not silently fall back to mock. */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof NetworkError) return true;
  if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) return true;
  return false;
}

/** Wraps an async fetcher: returns the real result on success, or the
 *  provided fallback (logged as a degraded-mode warning) when the call
 *  fails with a network-level error. Re-throws non-network errors so
 *  real bugs surface. */
export async function withMockFallback<T>(
  realFetcher: () => Promise<T>,
  mock: T,
  label: string,
): Promise<T> {
  try {
    return await realFetcher();
  } catch (err) {
    if (isNetworkError(err)) {
      console.warn(`[residentApi] ${label}: server unreachable, rendering mock data.`, err);
      return mock;
    }
    throw err;
  }
}
