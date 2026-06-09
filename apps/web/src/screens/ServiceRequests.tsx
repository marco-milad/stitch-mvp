// "My Requests" screen — server-fed source of truth.
//
// Renders TWO live-polled lists, both reading directly from the FastAPI
// backend so the resident only sees rows that genuinely persisted:
//
//   1. Maintenance tickets via the existing <MyMaintenanceTickets />
//      component (polls GET /me/requests every 5 s).
//
//   2. Service bookings (Cleaning, Laundry, Delivery, Pet, Gardening,
//      Security Guard, Wellness) via a sibling TanStack Query on
//      GET /me/service-bookings, also polled every 5 s.
//
// The legacy localStorage panel (powered by useServiceRequestsStore +
// MOCK_SEED_REQUESTS) was deceptive — it could show optimistic writes
// for bookings whose POST never landed server-side. It's gone. If
// you submit a tile booking and don't see it here within 5 s, the
// server didn't persist it, full stop.

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { MyMaintenanceTickets } from '@/components/requests/MyMaintenanceTickets';
import { formatFullDate, fromDateIso } from '@/lib/dates';
import { SERVICE_TILES } from '@/lib/mock/services';
import { getProviderById, offeringLabelKey } from '@/lib/mock/serviceProviders';
import {
  listMyServiceBookings,
  type ServiceBooking,
  type ServiceBookingStatus,
} from '@/lib/residentApi';
import { residentQueryOptions } from '@/lib/useResidentQuery';

const STATUS_TONE: Record<ServiceBookingStatus, { bg: string; fg: string }> = {
  pending: { bg: '#FEF3C7', fg: '#92400E' },
  confirmed: { bg: '#DBEAFE', fg: '#1D4ED8' },
  in_progress: { bg: '#EDE9FE', fg: '#6D28D9' },
  completed: { bg: '#D1FAE5', fg: '#047857' },
  cancelled: { bg: '#FEE2E2', fg: '#B91C1C' },
};

const ACTIVE_STATUSES = new Set<ServiceBookingStatus>(['pending', 'confirmed', 'in_progress']);

export function ServiceRequests() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const bookingsQuery = useQuery<ServiceBooking[]>({
    queryKey: ['me', 'service-bookings'],
    queryFn: listMyServiceBookings,
    // 5 s polling matches MyMaintenanceTickets so both panels refresh in
    // lockstep. Background-tab pause keeps mobile data cheap.
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    staleTime: 0,
    // Shared resident-query semantics: no retry storm on a Clerk blip;
    // keep last good list visible while a poll is in flight.
    ...residentQueryOptions<ServiceBooking[]>(),
  });

  const bookings = bookingsQuery.data ?? [];
  const activeBookings = bookings.filter((b) => ACTIVE_STATUSES.has(b.status));
  const pastBookings = bookings.filter((b) => !ACTIVE_STATUSES.has(b.status));

  return (
    <>
      <div className="sticky top-0 z-10 bg-white/55 dark:bg-ink-900/55 backdrop-blur-lg border-b border-white/40 dark:border-white/10 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-row items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/services')}
            aria-label="Back"
            className="p-2 -ms-2 rounded-lg hover:bg-white/40 dark:hover:bg-ink-700/60 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <ArrowLeft size={22} className="text-ink-700 dark:text-white rtl:rotate-180" />
          </button>
          <h1 className="text-base font-bold text-ink-900 dark:text-white truncate">
            {t('services.requests.title')}
          </h1>
        </div>
      </div>

      <div className="p-4">
        {/* Maintenance tickets — live from GET /me/requests, polled. */}
        <MyMaintenanceTickets />

        {/* Service bookings — live from GET /me/service-bookings, polled.
            Hidden completely when there are no bookings server-side so
            the resident can't be confused by ghost rows from a stale
            localStorage cache. */}
        {bookings.length > 0 && (
          <>
            {activeBookings.length > 0 && (
              <Section title={t('services.requests.activeTitle')} bookings={activeBookings} />
            )}
            {pastBookings.length > 0 && (
              <Section title={t('services.requests.pastTitle')} bookings={pastBookings} />
            )}
          </>
        )}
      </div>
    </>
  );
}

function Section({ title, bookings }: { title: string; bookings: ServiceBooking[] }) {
  return (
    <section className="mb-5">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-400 mb-2">{title}</h3>
      <div className="space-y-2">
        {bookings.map((b) => (
          <BookingCard key={b.id} booking={b} />
        ))}
      </div>
    </section>
  );
}

function BookingCard({ booking }: { booking: ServiceBooking }) {
  const { t, i18n } = useTranslation();
  const tile = SERVICE_TILES.find((tl) => tl.id === booking.tileId);
  const provider = getProviderById(booking.providerId);
  const tone = STATUS_TONE[booking.status];
  const dateObj = fromDateIso(booking.dateIso);
  const dateLabel = dateObj ? formatFullDate(dateObj, i18n.language) : booking.dateIso;

  return (
    <div className="bg-white/60 dark:bg-ink-700/60 backdrop-blur-md rounded-2xl p-3 border border-white/40 dark:border-white/10 shadow-lg shadow-ink-900/5 hover:scale-[1.02] hover:shadow-xl hover:shadow-ink-900/10 transition-all duration-300">
      <div className="flex flex-row items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink-900 dark:text-white truncate">
            {provider?.name ?? booking.providerId}
          </p>
          <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">
            {tile ? `${tile.name} · ` : ''}
            {t(offeringLabelKey(booking.tileId, booking.offeringKey))}
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-ink-700 dark:text-ink-100">
            <CalendarIcon size={11} />
            {t('services.requests.scheduledFor', {
              date: dateLabel,
              time: booking.timeSlot,
            })}
          </p>
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: tone.bg, color: tone.fg }}
        >
          {t(`services.requests.status.${booking.status}`)}
        </span>
      </div>
    </div>
  );
}
