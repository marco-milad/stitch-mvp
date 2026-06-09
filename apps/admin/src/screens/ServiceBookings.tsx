// Admin view of resident-submitted service bookings.
//
// Reads /admin/service-bookings (polled every 5 s — same cadence as
// the resident-side My Requests page) and renders one card per
// booking. Filterable by status. No dispatch / resolve actions yet
// (service bookings don't have a technician layer); when those land,
// extend this screen.

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/PageHeader';
import { StatusPill } from '@/components/StatusPill';
import { listServiceBookings } from '@/lib/api';
import type { ServiceBooking, ServiceBookingStatus } from '@/lib/types';

type StatusFilter = 'all' | ServiceBookingStatus;

const STATUS_FILTERS: StatusFilter[] = [
  'all',
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
];

const FILTER_LABEL_KEY: Record<StatusFilter, string> = {
  all: 'bookings.filters.all',
  pending: 'bookings.filters.pending',
  confirmed: 'bookings.filters.confirmed',
  in_progress: 'bookings.filters.inProgress',
  completed: 'bookings.filters.completed',
  cancelled: 'bookings.filters.cancelled',
};

function statusTone(status: ServiceBookingStatus): 'warning' | 'info' | 'success' | 'danger' {
  if (status === 'pending') return 'warning';
  if (status === 'confirmed') return 'info';
  if (status === 'in_progress') return 'info';
  if (status === 'completed') return 'success';
  return 'danger'; // cancelled
}

function fmtDateTime(dateIso: string, timeSlot: string, lang: string): string {
  // dateIso is YYYY-MM-DD; timeSlot is HH:MM — render both together.
  const d = new Date(`${dateIso}T${timeSlot}:00`);
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function fmtCreated(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function ServiceBookings() {
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState<StatusFilter>('all');

  const query = useQuery({
    queryKey: ['admin', 'service-bookings'],
    queryFn: listServiceBookings,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });

  const bookings = useMemo(() => query.data?.items ?? [], [query.data]);
  const filtered = useMemo(() => {
    if (filter === 'all') return bookings;
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title={t('bookings.title')}
        subtitle={t('bookings.subtitle')}
        action={
          <span className="text-[11px] text-ink-500 tabular-nums">
            {bookings.length} {t('bookings.totalSuffix')}
          </span>
        }
      />

      {/* Status filter tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((f) => {
          const active = f === filter;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={[
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                active
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'bg-white text-ink-700 border-ink-200 hover:border-ink-400',
              ].join(' ')}
            >
              {t(FILTER_LABEL_KEY[f])}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white border border-ink-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">{t('bookings.col.id')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('bookings.col.resident')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('bookings.col.unit')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('bookings.col.service')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('bookings.col.offering')}</th>
                <th className="px-4 py-3 text-start font-semibold">
                  {t('bookings.col.scheduled')}
                </th>
                <th className="px-4 py-3 text-start font-semibold">{t('bookings.col.status')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('bookings.col.created')}</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-ink-500 text-xs">
                    {t('bookings.loading')}
                  </td>
                </tr>
              )}

              {!query.isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-ink-500 text-xs">
                    {t('bookings.empty')}
                  </td>
                </tr>
              )}

              {filtered.map((b) => (
                <BookingRow key={b.id} booking={b} lang={i18n.language} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BookingRow({ booking, lang }: { booking: ServiceBooking; lang: string }) {
  const { t } = useTranslation();
  return (
    <tr className="border-t border-ink-100 hover:bg-ink-50/50 transition-colors">
      <td className="px-4 py-3 font-mono text-[11px] text-ink-500">{booking.id.slice(0, 8)}</td>
      <td className="px-4 py-3 text-ink-900">{booking.residentName}</td>
      <td className="px-4 py-3 text-ink-700">{booking.unit}</td>
      <td className="px-4 py-3 text-ink-900 font-medium">{booking.tileId}</td>
      <td className="px-4 py-3 text-ink-700">{booking.offeringKey}</td>
      <td className="px-4 py-3 text-ink-700 tabular-nums">
        {fmtDateTime(booking.dateIso, booking.timeSlot, lang)}
      </td>
      <td className="px-4 py-3">
        <StatusPill tone={statusTone(booking.status)}>
          {t(`bookings.status.${booking.status}`)}
        </StatusPill>
      </td>
      <td className="px-4 py-3 text-[11px] text-ink-500 tabular-nums whitespace-nowrap">
        {fmtCreated(booking.createdAt, lang)}
      </td>
    </tr>
  );
}
