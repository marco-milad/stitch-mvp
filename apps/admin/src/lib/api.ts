// Wires the admin to the FastAPI backend.
//   - HTTP: lightweight wrappers around fetch (no axios — keeps the bundle
//     small and the contract obvious). When/if Clerk admin auth lands, we
//     swap to `@stitch/api-client` with `getToken` and bearer headers.
//   - WS:   long-lived feed-stream connection with reconnect-on-close.
//     `subscribeFeed()` returns a teardown function and pushes JSON
//     envelopes from `app/api/v1/posts.py` to the caller.
//
// VITE_USE_MOCK_API=true short-circuits all HTTP — useful when developing
// the admin UI without a running uvicorn process.

import type {
  AdminFeedItem,
  AdminPost,
  AdminReel,
  GateScanEvent,
  ServiceRequest,
  Technician,
} from './types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';
const WS_BASE =
  import.meta.env.VITE_WS_URL ?? import.meta.env.VITE_API_WS_URL ?? 'ws://localhost:8000';

export const isMockMode = (import.meta.env.VITE_USE_MOCK_API ?? '').toLowerCase() === 'true';

// ─── HTTP ────────────────────────────────────────────────────────────────

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${body ? ` — ${body}` : ''}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type PublishPostInput = Omit<AdminPost, 'id' | 'publishedAt'>;
export type PublishReelInput = Omit<AdminReel, 'id' | 'publishedAt'>;

export async function listFeed(): Promise<AdminFeedItem[]> {
  const data = await http<{ items: AdminFeedItem[] }>('/posts');
  return data.items;
}

export async function publishPost(input: PublishPostInput): Promise<AdminPost> {
  return http<AdminPost>('/posts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function publishReel(input: PublishReelInput): Promise<AdminReel> {
  return http<AdminReel>('/posts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function removeItem(id: string): Promise<void> {
  await http<void>(`/posts/${id}`, { method: 'DELETE' });
}

// ─── WebSocket ───────────────────────────────────────────────────────────

export type FeedEvent =
  | { type: 'snapshot'; items: AdminFeedItem[] }
  | { type: 'feed.item.created'; item: AdminFeedItem }
  | { type: 'feed.item.deleted'; id: string }
  | { type: 'pong' };

export interface FeedSubscription {
  close: () => void;
  isOpen: () => boolean;
}

/**
 * Open a reconnecting WS to /posts/stream. The hub sends a `snapshot` frame
 * on connect, then a stream of `feed.item.created` / `feed.item.deleted`
 * events. Exponential backoff caps at 30s.
 */
export function subscribeFeed(onEvent: (event: FeedEvent) => void): FeedSubscription {
  let socket: WebSocket | null = null;
  let closed = false;
  let backoff = 500;

  const connect = () => {
    if (closed) return;
    try {
      socket = new WebSocket(`${WS_BASE}/api/v1/posts/stream`);
    } catch {
      schedule();
      return;
    }
    socket.onopen = () => {
      backoff = 500;
    };
    socket.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data) as FeedEvent;
        onEvent(payload);
      } catch {
        // ignore non-JSON frames
      }
    };
    socket.onerror = () => {
      // onclose will fire next; reconnect there.
    };
    socket.onclose = () => {
      if (closed) return;
      schedule();
    };
  };

  const schedule = () => {
    if (closed) return;
    setTimeout(connect, backoff);
    backoff = Math.min(backoff * 2, 30_000);
  };

  connect();

  return {
    close: () => {
      closed = true;
      socket?.close();
    },
    isOpen: () => socket?.readyState === WebSocket.OPEN,
  };
}

// ─── Service requests (Week 7) ───────────────────────────────────────────

export interface RequestsList {
  items: ServiceRequest[];
  technicians: Technician[];
}

export async function listRequests(): Promise<RequestsList> {
  return http<RequestsList>('/admin/requests');
}

export async function dispatchRequest(
  requestId: string,
  technicianId: string,
): Promise<ServiceRequest> {
  return http<ServiceRequest>(`/admin/requests/${requestId}/dispatch`, {
    method: 'POST',
    body: JSON.stringify({ technicianId }),
  });
}

export async function resolveRequest(requestId: string): Promise<ServiceRequest> {
  return http<ServiceRequest>(`/admin/requests/${requestId}/resolve`, {
    method: 'POST',
  });
}

export type RequestsStreamEvent =
  | { type: 'snapshot'; items: ServiceRequest[]; technicians: Technician[] }
  | { type: 'request.updated'; item: ServiceRequest }
  | { type: 'pong' };

export function subscribeRequestsStream(
  onEvent: (event: RequestsStreamEvent) => void,
  onStatusChange?: (connected: boolean) => void,
): FeedSubscription {
  let socket: WebSocket | null = null;
  let closed = false;
  let backoff = 500;

  const connect = () => {
    if (closed) return;
    try {
      socket = new WebSocket(`${WS_BASE}/api/v1/admin/requests/stream`);
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
        const payload = JSON.parse(ev.data) as RequestsStreamEvent;
        onEvent(payload);
      } catch {
        // ignore
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
    if (closed) return;
    setTimeout(connect, backoff);
    backoff = Math.min(backoff * 2, 30_000);
  };

  connect();

  return {
    close: () => {
      closed = true;
      socket?.close();
    },
    isOpen: () => socket?.readyState === WebSocket.OPEN,
  };
}

// ─── Gate stream (Week 7) ────────────────────────────────────────────────

export type GateStreamEvent =
  | { type: 'snapshot'; events: GateScanEvent[] }
  | { type: 'scan'; event: GateScanEvent }
  | { type: 'pong' };

export function subscribeGateStream(
  onEvent: (event: GateStreamEvent) => void,
  onStatusChange?: (connected: boolean) => void,
): FeedSubscription {
  let socket: WebSocket | null = null;
  let closed = false;
  let backoff = 500;

  const connect = () => {
    if (closed) return;
    try {
      socket = new WebSocket(`${WS_BASE}/api/v1/admin/gate/stream`);
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
        const payload = JSON.parse(ev.data) as GateStreamEvent;
        onEvent(payload);
      } catch {
        // ignore non-JSON frames
      }
    };
    socket.onerror = () => {
      // onclose fires next
    };
    socket.onclose = () => {
      onStatusChange?.(false);
      if (!closed) schedule();
    };
  };

  const schedule = () => {
    if (closed) return;
    setTimeout(connect, backoff);
    backoff = Math.min(backoff * 2, 30_000);
  };

  connect();

  return {
    close: () => {
      closed = true;
      socket?.close();
    },
    isOpen: () => socket?.readyState === WebSocket.OPEN,
  };
}
