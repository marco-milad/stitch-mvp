// Typed HTTP + WS clients for the resident-scoped (`/me/...`) backend
// endpoints. Tolerates `VITE_API_URL` with or without a trailing /api/v1.
//
// Defaults to `http://localhost:8000` so local dev works out of the box.
// In production builds these MUST be overridden via env vars:
//   VITE_API_URL    e.g. https://api.stitch.example.com
//   VITE_WS_URL     e.g. wss://api.stitch.example.com
// (VITE_API_WS_URL is honoured for back-compat with older .env files.)

const RAW_API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const API_BASE = RAW_API.replace(/\/api\/v1\/?$/, '');
const WS_BASE =
  import.meta.env.VITE_WS_URL ?? import.meta.env.VITE_API_WS_URL ?? 'ws://localhost:8000';

const HTTP_PREFIX = `${API_BASE}/api/v1`;

// Default HTTP timeout. On a refused/unreachable host fetch otherwise
// waits for the browser's network timeout (30s+) which freezes the UI.
const HTTP_TIMEOUT_MS = 6_000;

// Diagnostic: warn once at boot when the bundle is pointing at localhost
// but is running from a public domain (typical Vercel mis-config where
// VITE_API_URL wasn't set during build).
if (typeof window !== 'undefined') {
  const host = window.location.hostname;
  const apiIsLocal = /localhost|127\.0\.0\.1/.test(RAW_API);
  const hostIsLocal = host === 'localhost' || host === '127.0.0.1' || host === '';
  if (apiIsLocal && !hostIsLocal) {
    console.warn(
      '[residentApi] VITE_API_URL points at localhost while the app is hosted at',
      host,
      '— every /me/* call will silently fail. Set VITE_API_URL + VITE_WS_URL on the deployment.',
    );
  }
}

/** Thrown when the API server can't be reached (DNS failure, refused
 *  connection, timeout). Distinct from HTTP error responses so callers
 *  can branch: HTTP 5xx → retry, NetworkError → mock-fallback. */
export class NetworkError extends Error {
  override name = 'NetworkError';
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${HTTP_PREFIX}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    // AbortError (timeout) or TypeError (refused / DNS) — both treated
    // as network-level failures so callers can fall back to mock data.
    const reason = err instanceof Error ? err.message : 'unknown';
    throw new NetworkError(`Unable to reach ${HTTP_PREFIX}${path}: ${reason}`);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${body ? ` — ${body}` : ''}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ─── Visitor passes ────────────────────────────────────────────────────

export type VehicleKind = 'car' | 'delivery' | 'rideshare';

export interface VisitorPassInput {
  visitorName: string;
  vehicleKind: VehicleKind;
  validFrom: string;
  validTo: string;
  note?: string;
}

export interface VisitorPass extends VisitorPassInput {
  id: string;
  code: string;
  qrPayload: string;
  hostName: string;
  unit: string;
  createdAt: string;
}

export interface VisitorPassList {
  items: VisitorPass[];
}

export async function createVisitorPass(input: VisitorPassInput): Promise<VisitorPass> {
  return http<VisitorPass>('/me/visitor-passes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function listVisitorPasses(): Promise<VisitorPassList> {
  return http<VisitorPassList>('/me/visitor-passes');
}

// ─── Parking ───────────────────────────────────────────────────────────

export type ParkingZone = 'phase1' | 'sarai' | 'tajSultan';
export type SlotStatus = 'free' | 'reserved_self' | 'reserved_other';

export interface ParkingSlot {
  id: string;
  zone: ParkingZone;
  label: string;
  status: SlotStatus;
  reservedUntil: string | null;
}

export interface ParkingSlotsList {
  items: ParkingSlot[];
}

export interface ParkingBookingInput {
  slotId: string;
  until: string;
}

export interface ParkingBooking {
  id: string;
  slotId: string;
  slotLabel: string;
  zone: ParkingZone;
  residentName: string;
  until: string;
  createdAt: string;
}

export async function listParkingSlots(): Promise<ParkingSlotsList> {
  return http<ParkingSlotsList>('/me/parking/slots');
}

export async function bookParkingSlot(input: ParkingBookingInput): Promise<ParkingBooking> {
  return http<ParkingBooking>('/me/parking/bookings', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function releaseParkingBooking(id: string): Promise<void> {
  await http<void>(`/me/parking/bookings/${id}`, { method: 'DELETE' });
}

export async function listMyBookings(): Promise<ParkingBooking[]> {
  return http<ParkingBooking[]>('/me/parking/bookings');
}

// ─── Maintenance tickets ───────────────────────────────────────────────

export type TicketStatus = 'pending' | 'in_progress' | 'resolved';
export type TicketCategory = 'ac' | 'plumbing' | 'electrical' | 'cleaning' | 'pest' | 'other';
export type TicketUrgency = 'routine' | 'priority' | 'urgent';

export interface MaintenanceTicket {
  id: string;
  residentName: string;
  unit: string;
  category: TicketCategory;
  urgency: TicketUrgency;
  title: string | null;
  summary: string;
  status: TicketStatus;
  assigneeId: string | null;
  openedAt: string;
  updatedAt: string;
}

export interface TicketCreateInput {
  category: TicketCategory;
  title: string;
  description: string;
  urgency?: TicketUrgency;
}

// Roster used to resolve `assigneeId` → readable name + specialty.
// Matches the backend seed; refreshed once on screen mount via the GET.
export interface TicketTechnician {
  id: string;
  name: string;
  specialty: TicketCategory;
  load: number;
}

export async function listMyTickets(): Promise<MaintenanceTicket[]> {
  return http<MaintenanceTicket[]>('/me/requests');
}

export async function createMyTicket(input: TicketCreateInput): Promise<MaintenanceTicket> {
  return http<MaintenanceTicket>('/me/requests', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// Technicians live on the admin endpoint; the resident view also wants
// them so it can pretty-print the assignee. Re-using the admin GET is fine
// for the demo (no PII beyond name + specialty).
export async function listTechnicianRoster(): Promise<TicketTechnician[]> {
  const data = await http<{ technicians: TicketTechnician[] }>('/admin/requests');
  return data.technicians;
}

// ─── Notifications ─────────────────────────────────────────────────────

export type NotificationKind = 'ticket_created' | 'ticket_dispatched' | 'ticket_resolved';

export interface NotificationBody {
  en: string;
  ar: string;
}

export interface ResidentNotification {
  id: string;
  kind: NotificationKind;
  title: NotificationBody;
  body: NotificationBody;
  createdAt: string;
  link: string | null;
}

export async function listMyNotifications(): Promise<ResidentNotification[]> {
  const data = await http<{ items: ResidentNotification[] }>('/me/notifications');
  return data.items;
}

// ─── WS subscriptions ──────────────────────────────────────────────────

export interface WsSubscription {
  close: () => void;
}

export type TicketsEvent =
  | { type: 'snapshot'; items: MaintenanceTicket[] }
  | { type: 'request.updated'; item: MaintenanceTicket }
  | { type: 'pong' };

export interface WsSubscribeOptions {
  /** Fires `true` on each successful open and `false` on each close.
   *  Useful for "LIVE / OFFLINE" pills in the UI. */
  onStatusChange?: (connected: boolean) => void;
  /** Fires once after MAX_WS_ATTEMPTS consecutive failures with no
   *  successful open in between. Signals "server is permanently
   *  unreachable for this session — switch to mock data". The retry
   *  loop stops here; call sub.close() if you want to retry from
   *  scratch. */
  onPermanentFailure?: (reason: string) => void;
}

export function subscribeMyTickets(
  onEvent: (event: TicketsEvent) => void,
  optsOrStatus?: WsSubscribeOptions | ((connected: boolean) => void),
): WsSubscription {
  return openReconnectingWs<TicketsEvent>(
    `${WS_BASE}/api/v1/me/requests/stream`,
    onEvent,
    normaliseOpts(optsOrStatus),
  );
}

export type NotificationsEvent =
  | { type: 'snapshot'; items: ResidentNotification[] }
  | { type: 'notification.created'; item: ResidentNotification }
  | { type: 'pong' };

export function subscribeMyNotifications(
  onEvent: (event: NotificationsEvent) => void,
  optsOrStatus?: WsSubscribeOptions | ((connected: boolean) => void),
): WsSubscription {
  return openReconnectingWs<NotificationsEvent>(
    `${WS_BASE}/api/v1/me/notifications/stream`,
    onEvent,
    normaliseOpts(optsOrStatus),
  );
}

// Backwards-compat: callers used to pass just `(connected) => void`.
// Accept either shape so we don't have to touch every consumer at once.
function normaliseOpts(
  arg?: WsSubscribeOptions | ((connected: boolean) => void),
): WsSubscribeOptions {
  if (!arg) return {};
  if (typeof arg === 'function') return { onStatusChange: arg };
  return arg;
}

// ─── Internal: reconnecting WS helper ──────────────────────────────────
//
// Hardened against the "server unreachable" case: every step is wrapped
// in try/catch, retries are capped, and `onPermanentFailure` fires when
// the cap is hit so consumers can switch to mock data.

/** Max consecutive failed connection attempts before we give up and
 *  fire `onPermanentFailure`. With 500ms backoff doubling to 30s cap,
 *  six attempts spans ~60s. */
const MAX_WS_ATTEMPTS = 6;

function openReconnectingWs<T>(
  url: string,
  onEvent: (event: T) => void,
  opts: WsSubscribeOptions,
): WsSubscription {
  let socket: WebSocket | null = null;
  let closed = false;
  let backoff = 500;
  let attempts = 0;
  let permanentlyFailed = false;

  const giveUp = (reason: string) => {
    if (permanentlyFailed || closed) return;
    permanentlyFailed = true;
    console.warn(
      `[residentApi] WS ${url} unreachable after ${MAX_WS_ATTEMPTS} attempts — giving up. Reason: ${reason}`,
    );
    try {
      opts.onPermanentFailure?.(reason);
    } catch (err) {
      // Defensive: a throwing consumer callback shouldn't take down the
      // WS helper. Log and move on.
      console.error('[residentApi] onPermanentFailure threw:', err);
    }
  };

  const connect = () => {
    if (closed || permanentlyFailed) return;
    attempts += 1;

    // The WebSocket constructor can throw synchronously on a malformed
    // URL or when the page is sandboxed without ws permission. Catch
    // and route through the same retry/give-up logic as async failures.
    try {
      socket = new WebSocket(url);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'constructor threw';
      if (attempts >= MAX_WS_ATTEMPTS) {
        giveUp(reason);
      } else {
        schedule();
      }
      return;
    }

    socket.onopen = () => {
      // Successful connect resets the attempt counter so a flapping
      // server doesn't get penalised by stale prior failures.
      backoff = 500;
      attempts = 0;
      try {
        opts.onStatusChange?.(true);
      } catch (err) {
        console.error('[residentApi] onStatusChange threw on open:', err);
      }
    };

    socket.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data) as T;
        onEvent(payload);
      } catch {
        // Non-JSON frame or consumer throw — log and continue, don't
        // close the socket over one bad message.
      }
    };

    socket.onclose = (ev) => {
      try {
        opts.onStatusChange?.(false);
      } catch (err) {
        console.error('[residentApi] onStatusChange threw on close:', err);
      }
      if (closed) return;
      if (attempts >= MAX_WS_ATTEMPTS) {
        giveUp(`closed (code ${ev.code})`);
      } else {
        schedule();
      }
    };

    socket.onerror = () => {
      // onclose fires next — let that path drive retry / give-up.
    };
  };

  const schedule = () => {
    if (closed || permanentlyFailed) return;
    setTimeout(connect, backoff);
    backoff = Math.min(backoff * 2, 30_000);
  };

  connect();

  return {
    close: () => {
      closed = true;
      try {
        socket?.close();
      } catch {
        // Already closing / closed — fine.
      }
    },
  };
}
