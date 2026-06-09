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
//
// 20 s is the budget for the actual wire round trip (handshake →
// ngrok/Railway hop → FastAPI handler → DB → response). Earlier this
// was 6 s, but write paths going through ngrok plus Clerk JWT
// verification plus Railway-public-proxy Postgres can legitimately
// take 4-8 s on a cold cache and our 6 s budget was clipping them
// before the response had a chance to land. Per fix-B in
// residentApi.http(), the timer now also starts AFTER currentAuthToken
// resolves so Clerk SDK refresh time no longer counts against this
// budget either.
const HTTP_TIMEOUT_MS = 20_000;

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

/** Thrown when we're about to send an authenticated request but the
 *  Clerk session has no token. Short-circuits BEFORE fetch fires so the
 *  backend never sees an unauthenticated POST that 401s with "Missing
 *  Authorization header". Callers can catch this distinctly to prompt
 *  re-sign-in instead of showing a generic "Could not submit" error. */
export class AuthRequiredError extends Error {
  override name = 'AuthRequiredError';
  constructor(path: string) {
    super(`No active Clerk session for ${path} — sign in again to continue.`);
  }
}

/** Endpoints under `/me/*` always require a signed-in resident. Use this
 *  to gate the auth guard so anonymous endpoints (none today, but the
 *  shape is here for when /api/v1/public/* lands) don't get short-
 *  circuited. */
function pathRequiresAuth(path: string): boolean {
  return path.startsWith('/me/');
}

// ─── Auth token injection ────────────────────────────────────────────────
//
// `http()` calls the registered provider before every request and
// attaches `Authorization: Bearer <jwt>` when it returns a string. The
// app boots a small bridge component that registers Clerk's
// `getToken()` so signed-in residents authenticate transparently and
// signed-out browsers send no header at all (backend then 401s, which
// is the correct behaviour).
//
// Kept module-level (instead of a React context) because the WS opener
// needs the token too and lives outside the component tree.

type AuthTokenProvider = () => Promise<string | null>;
let authTokenProvider: AuthTokenProvider | null = null;

/** Wire the Clerk getToken (or any equivalent provider) once at app
 *  boot. Pass null to clear (test cleanup, sign-out, etc.). */
export function registerAuthTokenProvider(provider: AuthTokenProvider | null): void {
  authTokenProvider = provider;
}

async function currentAuthToken(): Promise<string | null> {
  if (!authTokenProvider) return null;
  try {
    return await authTokenProvider();
  } catch (err) {
    // A throwing provider shouldn't take down the request — log and
    // proceed with no token (the backend will 401, which is honest).
    console.warn('[residentApi] auth token provider threw:', err);
    return null;
  }
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  // 1. Resolve the auth token BEFORE arming the abort timer. Clerk SDK
  //    refresh can take real wall clock when the dev CDN is slow, and
  //    counting that against the fetch budget caused the 6 s abort
  //    storm on tile booking submissions. The timer now wraps the
  //    actual wire round trip only.
  const token = await currentAuthToken();

  // 2. Auth guard: don't fire authenticated requests with no bearer
  //    token. The backend would 401 with "Missing Authorization
  //    header" and the resident would just see "Could not submit your
  //    booking" with no useful signal. Throw a typed error so callers
  //    can prompt re-auth instead of treating it as a network/server
  //    problem.
  if (!token && pathRequiresAuth(path)) {
    console.warn(
      `[residentApi] Short-circuiting ${path}: no Clerk token available. Session likely expired.`,
    );
    throw new AuthRequiredError(path);
  }

  // 3. Arm the abort timer + fire the request.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${HTTP_PREFIX}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        // Hybrid local-dev escape hatch: when the resident frontend (live
        // on Vercel) is pointed at a local FastAPI via an ngrok tunnel,
        // ngrok would otherwise interpose its "You are about to visit"
        // browser warning on any browser-shaped request. Sending this
        // header on every API call tells ngrok to forward straight
        // through. Inert when the API URL is anything other than ngrok.
        'ngrok-skip-browser-warning': 'true',
        // Attach the Clerk JWT when one is available. Header-merge
        // order: caller-supplied headers can still override (rare).
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

// ─── Unit selection ────────────────────────────────────────────────────

export interface UnitSelectInput {
  /** Unit display name as the user sees it (e.g. "Villa 12", "Apt B-4-302"). */
  name: string;
  /** Compound / project the unit belongs to. Backend uses (name, project)
   *  as the dedupe key, so passing this consistently avoids duplicate
   *  Unit rows when two compounds happen to share a name. */
  project?: string | null;
  /** villa / townhouse / apartment / studio — sent verbatim, backend
   *  stores as a string. */
  unit_type?: string | null;
  area_sqm?: number | null;
  bedrooms?: number | null;
  /** owner / tenant / family-member. Maps to UnitMember.role. */
  role?: string;
}

export interface UnitSelectResult {
  unit_id: string;
  name: string;
  project: string | null;
  is_primary: boolean;
}

/** Tell the backend this is the resident's primary unit. Idempotent:
 *  picking the same unit twice is a no-op, picking a different one
 *  demotes the previous primary. Returns the persisted UnitSelectResult
 *  echoing what hit the DB so the caller can confirm. */
export async function selectMyPrimaryUnit(input: UnitSelectInput): Promise<UnitSelectResult> {
  return http<UnitSelectResult>('/me/units/select', {
    method: 'POST',
    body: JSON.stringify(input),
  });
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
  /** Calendar day the resident picked on the booking form (YYYY-MM-DD).
   *  Null on emergency / walk-up / legacy tickets. */
  scheduledDateIso: string | null;
  /** Canonical "HH:MM-HH:MM" slot label from MAINTENANCE_TIME_SLOTS.
   *  Null when the ticket wasn't scheduled through the slot picker. */
  scheduledTimeSlot: string | null;
}

export interface TicketCreateInput {
  category: TicketCategory;
  title: string;
  description: string;
  urgency?: TicketUrgency;
  /** When both fields are provided, the backend capacity-checks the
   *  slot and rejects with 409 if it's full. When either is omitted,
   *  both are dropped and the ticket is created without a schedule. */
  scheduledDateIso?: string;
  scheduledTimeSlot?: string;
}

// ─── Maintenance slot availability ──────────────────────────────────────
//
// Powers the 24/7 slot picker on the Home Services booking form. The
// backend has a matching single-source-of-truth TIME_SLOTS tuple in
// app/services/maintenance_slots.py — the two MUST stay in sync. When
// you add or reorder slots, change both files in the same commit.

/** 8 sequential 3-hour windows spanning a full 24-hour day, starting at
 *  09:00 and wrapping past midnight back to 09:00. Order is rendered
 *  order on the grid. Mirror of backend TIME_SLOTS. */
export const MAINTENANCE_TIME_SLOTS = [
  '09:00-12:00',
  '12:00-15:00',
  '15:00-18:00',
  '18:00-21:00',
  '21:00-00:00',
  '00:00-03:00',
  '03:00-06:00',
  '06:00-09:00',
] as const;

export type MaintenanceTimeSlot = (typeof MAINTENANCE_TIME_SLOTS)[number];

export interface MaintenanceSlotAvailability {
  slot: MaintenanceTimeSlot;
  bookedCount: number;
  capacity: number;
  available: boolean;
}

export interface MaintenanceAvailabilityResponse {
  category: string;
  dateIso: string;
  capacityPerSlot: number;
  slots: MaintenanceSlotAvailability[];
}

/** Public read-only endpoint — no Clerk JWT required. Cheap query: a
 *  single group-by-with-count over active tickets matching (category,
 *  date). Safe to poll on every form-date change. */
export async function getMaintenanceAvailability(
  category: TicketCategory,
  dateIso: string,
): Promise<MaintenanceAvailabilityResponse> {
  const params = new URLSearchParams({ category, date_iso: dateIso });
  return http<MaintenanceAvailabilityResponse>(`/maintenance/availability?${params.toString()}`);
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

// ─── Service bookings (Cleaning, Laundry, Wellness, etc.) ────────────────
//
// Distinct from the maintenance ticket pipeline. Home Services (tile
// `daily-home`) deliberately routes through `createMyTicket()` instead,
// so it shares the admin dispatch board. Everything else (the other six
// daily-* bookable tiles + wellness) lands here.

export type ServiceBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface ServiceBooking {
  id: string;
  residentName: string;
  unit: string;
  tileId: string;
  providerId: string;
  offeringKey: string;
  dateIso: string;
  timeSlot: string;
  notes: string | null;
  status: ServiceBookingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceBookingCreateInput {
  tileId: string;
  providerId: string;
  offeringKey: string;
  dateIso: string;
  timeSlot: string;
  notes?: string;
}

export async function listMyServiceBookings(): Promise<ServiceBooking[]> {
  const data = await http<{ items: ServiceBooking[] }>('/me/service-bookings');
  return data.items;
}

export async function createMyServiceBooking(
  input: ServiceBookingCreateInput,
): Promise<ServiceBooking> {
  return http<ServiceBooking>('/me/service-bookings', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export type ServiceBookingsEvent =
  | { type: 'snapshot'; items: ServiceBooking[] }
  | { type: 'booking.updated'; item: ServiceBooking }
  | { type: 'pong' };

export function subscribeMyServiceBookings(
  onEvent: (event: ServiceBookingsEvent) => void,
  optsOrStatus?: WsSubscribeOptions | ((connected: boolean) => void),
): WsSubscription {
  return openReconnectingWs<ServiceBookingsEvent>(
    `${WS_BASE}/api/v1/me/service-bookings/stream`,
    onEvent,
    normaliseOpts(optsOrStatus),
  );
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

// ─── WS auth helper ──────────────────────────────────────────────────────
//
// Browser WebSocket constructor accepts no custom headers. The backend
// (apps/api/app/core/auth.py:get_current_user_ws) reads the JWT from
// the `?token=` query param as a first-class alternative to the
// Authorization header. We append it here at open time.

async function withWsAuth(rawUrl: string): Promise<string> {
  const token = await currentAuthToken();
  if (!token) return rawUrl;
  const sep = rawUrl.includes('?') ? '&' : '?';
  return `${rawUrl}${sep}token=${encodeURIComponent(token)}`;
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

  const connect = async () => {
    if (closed || permanentlyFailed) return;
    attempts += 1;

    // Resolve a fresh JWT each reconnect attempt — Clerk rotates tokens
    // every ~60s, so re-using the original would 4401 after a while.
    const authedUrl = await withWsAuth(url);

    // The WebSocket constructor can throw synchronously on a malformed
    // URL or when the page is sandboxed without ws permission. Catch
    // and route through the same retry/give-up logic as async failures.
    try {
      socket = new WebSocket(authedUrl);
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
