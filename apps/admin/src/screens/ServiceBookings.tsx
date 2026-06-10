// Admin view of resident-submitted service bookings.
//
// Lifecycle (Option B):
//   pending  ──[Confirm]──►  confirmed  ──[Complete]──►  completed
//      │                          │
//      └──[Cancel]── cancelled ◄──┘
//
// `completed` and `cancelled` are terminal — no further actions render.
// `in_progress` exists on the schema for future granularity but isn't
// produced by current transitions.
//
// Polled every 5 s from /admin/service-bookings; mutations invalidate
// the cache on success so the row reflects the new status instantly.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCircle2, MessageSquare, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/PageHeader';
import { SlotFilterPanel } from '@/components/SlotFilterPanel';
import { SlotLoadRibbon } from '@/components/SlotLoadRibbon';
import { StatusPill } from '@/components/StatusPill';
import {
  cancelServiceBooking,
  completeServiceBooking,
  confirmServiceBooking,
  listServiceBookings,
  updateServiceBookingNotes,
} from '@/lib/api';
import { todayIso, UNSCHEDULED_SENTINEL, type MaintenanceTimeSlot } from '@/lib/slots';
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

const QUERY_KEY = ['admin', 'service-bookings'] as const;

function fmtDay(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function ServiceBookings() {
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>(() => todayIso());
  const [slotFilter, setSlotFilter] = useState<string | null>(null);
  const [tileFilter, setTileFilter] = useState<string | null>(null);

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: listServiceBookings,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });

  const bookings = useMemo(() => query.data?.items ?? [], [query.data]);

  const filtered = useMemo(() => {
    let rows = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);
    if (tileFilter) {
      rows = rows.filter((b) => b.tileId === tileFilter);
    }
    if (slotFilter === UNSCHEDULED_SENTINEL) {
      // Bookings always carry a schedule today, so this is effectively
      // a no-op — but keeping the case match means the filter panel can
      // stay generic across both screens.
      rows = [];
    } else if (slotFilter) {
      rows = rows.filter((b) => b.dateIso === scheduleDate && b.timeSlot === slotFilter);
    }
    return rows;
  }, [bookings, filter, tileFilter, slotFilter, scheduleDate]);

  // Ribbon counts: completed / cancelled bookings have closed out so
  // they don't consume future capacity. Active + pending bookings do.
  const countsBySlot = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bookings) {
      if (b.dateIso !== scheduleDate) continue;
      if (b.status === 'completed' || b.status === 'cancelled') continue;
      if (tileFilter && b.tileId !== tileFilter) continue;
      m.set(b.timeSlot, (m.get(b.timeSlot) ?? 0) + 1);
    }
    return m;
  }, [bookings, scheduleDate, tileFilter]);

  // Distinct tile ids present in the current dataset, sorted. The
  // catalog doesn't have a fixed enum on this side, so derive from
  // what's actually in flight — keeps the dropdown honest as new
  // tile flows come online.
  const tileOptions = useMemo(() => {
    const tiles = new Set<string>();
    for (const b of bookings) tiles.add(b.tileId);
    return Array.from(tiles)
      .sort()
      .map((tileId) => ({ value: tileId, label: tileId }));
  }, [bookings]);

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

      <SlotLoadRibbon
        countsBySlot={countsBySlot}
        selectedSlot={slotFilter && slotFilter !== UNSCHEDULED_SENTINEL ? slotFilter : null}
        onSelectSlot={(s: MaintenanceTimeSlot | null) => setSlotFilter(s)}
        dateLabel={fmtDay(scheduleDate, i18n.language)}
      />

      <SlotFilterPanel
        dateIso={scheduleDate}
        onDateChange={setScheduleDate}
        slot={slotFilter}
        onSlotChange={(s) => setSlotFilter(s)}
        category={tileFilter}
        onCategoryChange={setTileFilter}
        categories={tileOptions}
        categoryLabelKey="bookings.filters.tileLabel"
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
                <th className="px-4 py-3 text-start font-semibold">{t('bookings.col.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-ink-500 text-xs">
                    {t('bookings.loading')}
                  </td>
                </tr>
              )}

              {!query.isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-ink-500 text-xs">
                    {t('bookings.empty')}
                  </td>
                </tr>
              )}

              {filtered.map((b) => (
                <BookingRow
                  key={b.id}
                  booking={b}
                  lang={i18n.language}
                  notesOpen={editingNotesId === b.id}
                  onToggleNotes={() => setEditingNotesId(editingNotesId === b.id ? null : b.id)}
                  onCloseNotes={() => setEditingNotesId(null)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BookingRow({
  booking,
  lang,
  notesOpen,
  onToggleNotes,
  onCloseNotes,
}: {
  booking: ServiceBooking;
  lang: string;
  notesOpen: boolean;
  onToggleNotes: () => void;
  onCloseNotes: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
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
        <td className="px-4 py-3">
          <ActionButtons booking={booking} onOpenNotes={onToggleNotes} notesOpen={notesOpen} />
        </td>
      </tr>
      {notesOpen && (
        <tr className="border-t border-ink-100 bg-amber-50/40">
          <td colSpan={9} className="px-4 py-3">
            <NotesEditor booking={booking} onClose={onCloseNotes} />
          </td>
        </tr>
      )}
    </>
  );
}

function ActionButtons({
  booking,
  onOpenNotes,
  notesOpen,
}: {
  booking: ServiceBooking;
  onOpenNotes: () => void;
  notesOpen: boolean;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const confirm = useMutation({
    mutationFn: () => confirmServiceBooking(booking.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (err: Error) => window.alert(err.message),
  });
  const complete = useMutation({
    mutationFn: () => completeServiceBooking(booking.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (err: Error) => window.alert(err.message),
  });
  const cancel = useMutation({
    mutationFn: () => cancelServiceBooking(booking.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (err: Error) => window.alert(err.message),
  });

  const anyPending = confirm.isPending || complete.isPending || cancel.isPending;
  const canConfirm = booking.status === 'pending';
  const canComplete = booking.status === 'confirmed' || booking.status === 'in_progress';
  const canCancel =
    booking.status === 'pending' ||
    booking.status === 'confirmed' ||
    booking.status === 'in_progress';

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {canConfirm && (
        <button
          type="button"
          onClick={() => confirm.mutate()}
          disabled={anyPending}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
        >
          <Check size={11} />
          {t('bookings.actions.confirm')}
        </button>
      )}
      {canComplete && (
        <button
          type="button"
          onClick={() => complete.mutate()}
          disabled={anyPending}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
        >
          <CheckCircle2 size={11} />
          {t('bookings.actions.complete')}
        </button>
      )}
      {canCancel && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm(t('bookings.actions.cancelConfirm'))) cancel.mutate();
          }}
          disabled={anyPending}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
        >
          <X size={11} />
          {t('bookings.actions.cancel')}
        </button>
      )}
      <button
        type="button"
        onClick={onOpenNotes}
        className={[
          'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors',
          notesOpen
            ? 'border-amber-300 bg-amber-100 text-amber-800'
            : booking.adminNotes
              ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
              : 'border-ink-200 bg-white text-ink-500 hover:border-ink-400',
        ].join(' ')}
        title={booking.adminNotes ?? t('bookings.actions.noNotes')}
      >
        <MessageSquare size={11} />
        {t(booking.adminNotes ? 'bookings.actions.editNotes' : 'bookings.actions.addNotes')}
      </button>
    </div>
  );
}

function NotesEditor({ booking, onClose }: { booking: ServiceBooking; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [draft, setDraft] = useState(booking.adminNotes ?? '');

  // Reset draft when the booking's stored notes change (e.g. another
  // admin updated them concurrently and our poll picked it up).
  useEffect(() => {
    setDraft(booking.adminNotes ?? '');
  }, [booking.adminNotes]);

  const save = useMutation({
    mutationFn: () => updateServiceBookingNotes(booking.id, draft.trim() || null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      onClose();
    },
    onError: (err: Error) => window.alert(err.message),
  });

  return (
    <div className="space-y-2">
      <label
        htmlFor={`notes-${booking.id}`}
        className="block text-[10px] uppercase tracking-wider font-bold text-ink-500"
      >
        {t('bookings.notes.label')} · {booking.id.slice(0, 8)}
      </label>
      <textarea
        id={`notes-${booking.id}`}
        rows={2}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t('bookings.notes.placeholder')}
        maxLength={2000}
        className="w-full rounded-lg border border-ink-200 px-3 py-2 text-xs text-ink-900 bg-white outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 transition-all"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={save.isPending}
          className="px-3 py-1.5 rounded-md text-[11px] font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50 transition-colors"
        >
          {t('bookings.notes.cancel')}
        </button>
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="px-3 py-1.5 rounded-md text-[11px] font-semibold bg-ink-900 text-white hover:bg-ink-800 disabled:opacity-50 transition-colors"
        >
          {save.isPending ? t('bookings.notes.saving') : t('bookings.notes.save')}
        </button>
      </div>
    </div>
  );
}
