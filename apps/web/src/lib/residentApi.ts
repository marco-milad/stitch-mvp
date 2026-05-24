// Typed HTTP + WS clients for the resident-scoped (`/me/...`) backend
// endpoints. Tolerates `VITE_API_URL` with or without a trailing /api/v1.

const RAW_API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const API_BASE = RAW_API.replace(/\/api\/v1\/?$/, '');
const WS_BASE =
  import.meta.env.VITE_WS_URL ?? import.meta.env.VITE_API_WS_URL ?? 'ws://localhost:8000';

const HTTP_PREFIX = `${API_BASE}/api/v1`;

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${HTTP_PREFIX}${path}`, {
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

export function subscribeMyTickets(
  onEvent: (event: TicketsEvent) => void,
  onStatusChange?: (connected: boolean) => void,
): WsSubscription {
  return openReconnectingWs<TicketsEvent>(
    `${WS_BASE}/api/v1/me/requests/stream`,
    onEvent,
    onStatusChange,
  );
}

export type NotificationsEvent =
  | { type: 'snapshot'; items: ResidentNotification[] }
  | { type: 'notification.created'; item: ResidentNotification }
  | { type: 'pong' };

export function subscribeMyNotifications(
  onEvent: (event: NotificationsEvent) => void,
  onStatusChange?: (connected: boolean) => void,
): WsSubscription {
  return openReconnectingWs<NotificationsEvent>(
    `${WS_BASE}/api/v1/me/notifications/stream`,
    onEvent,
    onStatusChange,
  );
}

// ─── Internal: reconnecting WS helper ──────────────────────────────────

function openReconnectingWs<T>(
  url: string,
  onEvent: (event: T) => void,
  onStatusChange?: (connected: boolean) => void,
): WsSubscription {
  let socket: WebSocket | null = null;
  let closed = false;
  let backoff = 500;

  const connect = () => {
    if (closed) return;
    try {
      socket = new WebSocket(url);
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
        const payload = JSON.parse(ev.data) as T;
        onEvent(payload);
      } catch {
        // ignore non-JSON
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
  };
}
