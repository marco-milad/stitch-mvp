// Leads Hub — surfaces the Discover funnel's EOI submissions + visit
// bookings to authorized admin / super_admin users.
//
// Two tables stacked, sand/ink aesthetic matching the rest of the
// admin board. Both panels poll their respective backend endpoints
// every 30 s so a newly-submitted lead appears without a manual
// refresh, but neither carries the heavier 5 s polling the live ops
// surfaces use — the lead-list cadence isn't second-sensitive.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  Check,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Tag,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/PageHeader';
import { StatusPill } from '@/components/StatusPill';
import {
  adminListDiscoverBookings,
  adminListEoi,
  adminUpdateBookingStatus,
  type UpdateBookingStatusInput,
} from '@/lib/api';
import type {
  DiscoverBookingDecision,
  DiscoverBookingLead,
  DiscoverBookingStatus,
  EoiLead,
} from '@/lib/types';

const EOI_KEY = ['admin', 'discover', 'eoi'] as const;
const BOOKINGS_KEY = ['admin', 'discover', 'bookings'] as const;

function fmt(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function fmtDay(iso: string, lang: string): string {
  // Treat the YYYY-MM-DD as UTC midnight so the date doesn't shift in
  // negative-offset locales (matches the resident-side helpers).
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}

interface DecisionTarget {
  booking: DiscoverBookingLead;
  status: Exclude<DiscoverBookingStatus, 'pending'>;
}

export function Leads() {
  const { t, i18n } = useTranslation();
  // Open-decision modal — set when the admin clicks Confirm / Reject.
  // Holds both the target row and the intended next status so the
  // modal can render the right title + CTA copy without re-prompting.
  const [decisionTarget, setDecisionTarget] = useState<DecisionTarget | null>(null);
  // Most-recent decision response — drives the WhatsApp toast.
  const [recentDecision, setRecentDecision] = useState<DiscoverBookingDecision | null>(null);

  const eoiQuery = useQuery<EoiLead[]>({
    queryKey: EOI_KEY,
    queryFn: adminListEoi,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });

  const bookingsQuery = useQuery<DiscoverBookingLead[]>({
    queryKey: BOOKINGS_KEY,
    queryFn: adminListDiscoverBookings,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });

  const eoi = eoiQuery.data ?? [];
  const bookings = bookingsQuery.data ?? [];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title={t('leads.title')}
        subtitle={t('leads.subtitle')}
        action={
          <span className="text-[11px] text-ink-500 tabular-nums">
            {t('leads.totals', { eoi: eoi.length, bookings: bookings.length })}
          </span>
        }
      />

      {/* EOI table */}
      <Section
        title={t('leads.eoi.title')}
        subtitle={t('leads.eoi.subtitle', { count: eoi.length })}
        Icon={Mail}
      >
        {eoiQuery.isLoading ? (
          <LoadingRow />
        ) : eoiQuery.isError ? (
          <ErrorRow message={(eoiQuery.error as Error)?.message ?? 'unknown'} />
        ) : eoi.length === 0 ? (
          <EmptyRow message={t('leads.eoi.empty')} />
        ) : (
          <Table>
            <Thead>
              <Th>{t('leads.col.id')}</Th>
              <Th>{t('leads.col.name')}</Th>
              <Th>{t('leads.col.contact')}</Th>
              <Th>{t('leads.col.interest')}</Th>
              <Th>{t('leads.col.budget')}</Th>
              <Th>{t('leads.col.timeline')}</Th>
              <Th>{t('leads.col.notes')}</Th>
              <Th>{t('leads.col.submitted')}</Th>
            </Thead>
            <tbody>
              {eoi.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-ink-100 hover:bg-ink-50/50 transition-colors align-top"
                >
                  <td className="px-4 py-3 font-mono text-[11px] text-ink-500">
                    {row.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-ink-900 font-semibold">{row.name}</td>
                  <td className="px-4 py-3 text-ink-700">
                    <div className="flex flex-col gap-0.5">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Mail size={11} className="text-ink-400" />
                        {row.email}
                      </span>
                      {row.phone && (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-ink-500 tabular-nums"
                          dir="ltr"
                        >
                          <Phone size={11} className="text-ink-400" />
                          {row.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-700">
                    {row.interestType ? (
                      <StatusPill tone="info">{t(`leads.interest.${row.interestType}`)}</StatusPill>
                    ) : (
                      <span className="text-[11px] text-ink-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-700 text-xs">{row.budget || '—'}</td>
                  <td className="px-4 py-3 text-ink-700 text-xs">{row.timeline || '—'}</td>
                  <td className="px-4 py-3 text-ink-500 text-[11px] max-w-[260px]">
                    {row.notes ? (
                      <span className="line-clamp-2">{row.notes}</span>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-ink-500 tabular-nums whitespace-nowrap">
                    {fmt(row.createdAt, i18n.language)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      {/* Bookings table */}
      <Section
        title={t('leads.bookings.title')}
        subtitle={t('leads.bookings.subtitle', { count: bookings.length })}
        Icon={CalendarClock}
      >
        {bookingsQuery.isLoading ? (
          <LoadingRow />
        ) : bookingsQuery.isError ? (
          <ErrorRow message={(bookingsQuery.error as Error)?.message ?? 'unknown'} />
        ) : bookings.length === 0 ? (
          <EmptyRow message={t('leads.bookings.empty')} />
        ) : (
          <Table>
            <Thead>
              <Th>{t('leads.col.id')}</Th>
              <Th>{t('leads.col.visitor')}</Th>
              <Th>{t('leads.col.contact')}</Th>
              <Th>{t('leads.col.visitType')}</Th>
              <Th>{t('leads.col.scheduledFor')}</Th>
              <Th>{t('leads.col.advisor')}</Th>
              <Th>{t('leads.col.status')}</Th>
              <Th>{t('leads.col.submitted')}</Th>
              <Th>{t('leads.col.actions')}</Th>
            </Thead>
            <tbody>
              {bookings.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-ink-100 hover:bg-ink-50/50 transition-colors align-top"
                >
                  <td className="px-4 py-3 font-mono text-[11px] text-ink-500">
                    {row.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-ink-900 font-semibold">
                    {row.name}
                    {row.adminNotes && (
                      <div className="mt-1 text-[11px] text-ink-500 italic line-clamp-2 max-w-[240px]">
                        <span className="font-semibold not-italic">
                          {t('leads.bookings.adminNotesLabel')}:
                        </span>{' '}
                        {row.adminNotes}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-700">
                    <div className="flex flex-col gap-0.5">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Mail size={11} className="text-ink-400" />
                        {row.email}
                      </span>
                      {row.phone && (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-ink-500 tabular-nums"
                          dir="ltr"
                        >
                          <Phone size={11} className="text-ink-400" />
                          {row.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill
                      tone={
                        row.visitType === 'showroom'
                          ? 'info'
                          : row.visitType === 'onsite'
                            ? 'success'
                            : 'warning'
                      }
                    >
                      {t(`leads.visitType.${row.visitType}`)}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-3 text-ink-700">
                    <div className="flex flex-col leading-tight">
                      <span className="text-xs tabular-nums" dir="ltr">
                        {fmtDay(row.bookingDate, i18n.language)}
                      </span>
                      <span className="text-[11px] text-ink-500 tabular-nums" dir="ltr">
                        {row.timeSlot}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-700 text-xs">
                    {row.advisorName || (
                      <span className="text-ink-400">{t('leads.advisor.any')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <BookingStatusPill status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-[11px] text-ink-500 tabular-nums whitespace-nowrap">
                    {fmt(row.createdAt, i18n.language)}
                  </td>
                  <td className="px-4 py-3">
                    {row.status === 'pending' ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setDecisionTarget({ booking: row, status: 'confirmed' })}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-[0.97] transition-all"
                        >
                          <Check size={11} />
                          {t('leads.actions.confirm')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDecisionTarget({ booking: row, status: 'rejected' })}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 active:scale-[0.97] transition-all"
                        >
                          <X size={11} />
                          {t('leads.actions.reject')}
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-ink-400 italic">
                        {t('leads.actions.settled')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      {decisionTarget && (
        <DecisionModal
          target={decisionTarget}
          onClose={() => setDecisionTarget(null)}
          onSettled={(decision) => {
            setDecisionTarget(null);
            setRecentDecision(decision);
          }}
        />
      )}

      {recentDecision && (
        <WhatsAppToast decision={recentDecision} onDismiss={() => setRecentDecision(null)} />
      )}
    </div>
  );
}

// ─── Approval workflow ────────────────────────────────────────────────────

function BookingStatusPill({ status }: { status: DiscoverBookingStatus }) {
  const { t } = useTranslation();
  // Tone map: warning (amber) for pending, success (emerald) for
  // confirmed, danger (red) for rejected. Matches the spec's
  // yellow/green/red colour grammar.
  const tone: 'warning' | 'success' | 'danger' =
    status === 'pending' ? 'warning' : status === 'confirmed' ? 'success' : 'danger';
  return <StatusPill tone={tone}>{t(`leads.bookingStatus.${status}`)}</StatusPill>;
}

function DecisionModal({
  target,
  onClose,
  onSettled,
}: {
  target: DecisionTarget;
  onClose: () => void;
  onSettled: (decision: DiscoverBookingDecision) => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isConfirm = target.status === 'confirmed';

  const mutation = useMutation({
    mutationFn: (input: UpdateBookingStatusInput) => adminUpdateBookingStatus(input),
    onSuccess: (decision) => {
      void qc.invalidateQueries({ queryKey: BOOKINGS_KEY });
      onSettled(decision);
    },
    onError: (err: Error) => {
      // 409 → advisor double-booking. Surface a tailored message so the
      // admin can re-assign the advisor or pick a different slot without
      // dismissing the modal and losing the notes they just typed.
      const msg = err.message ?? '';
      if (msg.startsWith('409')) {
        setErrorMessage(t('leads.decision.errors.conflict'));
      } else {
        setErrorMessage(msg || t('leads.decision.errors.generic'));
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    mutation.mutate({
      bookingId: target.booking.id,
      status: target.status,
      adminNotes: notes.trim() || null,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !mutation.isPending) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-ink-100 overflow-hidden"
      >
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-ink-100 bg-sand-50/60">
          <div className="flex flex-col min-w-0">
            <h2 className="text-sm font-bold text-ink-950 leading-tight">
              {isConfirm ? t('leads.decision.confirmTitle') : t('leads.decision.rejectTitle')}
            </h2>
            <p className="text-[11px] text-ink-500 truncate">
              {target.booking.name} · {target.booking.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            aria-label={t('leads.decision.cancel')}
            className="p-1.5 rounded-md text-ink-500 hover:bg-ink-100 disabled:opacity-40"
          >
            <X size={14} />
          </button>
        </header>

        <div className="px-5 py-4 space-y-3">
          {errorMessage && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
              <p className="font-semibold">{t('leads.decision.errors.title')}</p>
              <p className="mt-0.5 opacity-90">{errorMessage}</p>
            </div>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
              {t('leads.decision.notesLabel')}
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isConfirm
                  ? t('leads.decision.notesConfirmPlaceholder')
                  : t('leads.decision.notesRejectPlaceholder')
              }
              maxLength={2000}
              rows={4}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-xs text-ink-900 bg-white outline-none focus:border-ink-400 focus:ring-1 focus:ring-ink-200 resize-none"
            />
            <span className="text-[10px] text-ink-400">{t('leads.decision.notesHelp')}</span>
          </label>
        </div>

        <footer className="flex items-center gap-2 px-5 py-3 border-t border-ink-100">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="flex-1 px-3 py-2 rounded-md text-xs font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50"
          >
            {t('leads.decision.cancel')}
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className={[
              'flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-all active:scale-[0.99] disabled:opacity-50',
              isConfirm
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-red-600 text-white hover:bg-red-700',
            ].join(' ')}
          >
            {mutation.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : isConfirm ? (
              <Check size={12} />
            ) : (
              <X size={12} />
            )}
            {mutation.isPending
              ? t('leads.decision.submitting')
              : isConfirm
                ? t('leads.decision.submitConfirm')
                : t('leads.decision.submitReject')}
          </button>
        </footer>
      </form>
    </div>
  );
}

function WhatsAppToast({
  decision,
  onDismiss,
}: {
  decision: DiscoverBookingDecision;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  // Auto-dismiss after 8 s so a series of decisions don't pile up on
  // screen. Longer than the usual toast dwell because the admin needs
  // a moment to register the WhatsApp link before it goes.
  useEffect(() => {
    const id = setTimeout(onDismiss, 8000);
    return () => clearTimeout(id);
  }, [decision, onDismiss]);

  const statusLabelKey = `leads.bookingStatus.${decision.booking.status}`;
  const hasLink = !!decision.whatsappUrl;
  return (
    <div
      role="status"
      className="fixed bottom-6 end-6 z-50 max-w-sm bg-ink-950 text-white rounded-2xl shadow-2xl border border-ink-800 overflow-hidden animate-rise-in"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <Check size={14} className="text-emerald-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">
            {t('leads.toast.title', {
              name: decision.booking.name,
              status: t(statusLabelKey),
            })}
          </p>
          <p className="text-[11px] opacity-70 leading-snug mt-0.5">
            {hasLink ? t('leads.toast.subtitle') : t('leads.toast.noPhone')}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('leads.toast.dismiss')}
          className="p-1 -m-1 rounded-md opacity-60 hover:opacity-100 hover:bg-white/10 transition-opacity"
        >
          <X size={12} />
        </button>
      </div>
      {hasLink && decision.whatsappUrl && (
        <a
          href={decision.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onDismiss}
          className="block px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold text-center transition-colors inline-flex items-center justify-center gap-1.5 w-full"
        >
          <MessageCircle size={12} />
          {t('leads.toast.openWhatsapp')}
        </a>
      )}
    </div>
  );
}

// ─── Pieces ────────────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  Icon,
  children,
}: {
  title: string;
  subtitle: string;
  Icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-ink-100 rounded-2xl shadow-sm overflow-hidden">
      <header className="flex flex-row items-center gap-3 px-5 py-4 border-b border-ink-100 bg-sand-50/60">
        <div className="w-9 h-9 rounded-xl bg-ink-950 text-white flex items-center justify-center flex-shrink-0">
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-ink-950 leading-tight">{title}</h2>
          <p className="text-[11px] text-ink-500 leading-tight">{subtitle}</p>
        </div>
      </header>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full text-sm">{children}</table>;
}

function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-ink-50 text-ink-500 text-[11px] uppercase tracking-wider">
      <tr>{children}</tr>
    </thead>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-start font-semibold">{children}</th>;
}

function LoadingRow() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center py-10 text-ink-500 text-xs">
      <Loader2 size={14} className="animate-spin me-2" />
      {t('leads.loading')}
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-10 text-ink-500 text-xs">
      <UserIcon size={14} className="me-2 text-ink-400" />
      {message}
    </div>
  );
}

function ErrorRow({ message }: { message: string }) {
  const { t } = useTranslation();
  return (
    <div className="px-5 py-4 m-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
      <p className="font-semibold">{t('leads.errors.load')}</p>
      <p className="mt-1 opacity-80 line-clamp-2 break-words">{message}</p>
    </div>
  );
}

// Quiet the unused-import lint when we don't render the Tag chip below;
// keeping the import handy for the next iteration that adds quick-tag
// labels to high-priority leads.
const _quietTag = Tag;
void _quietTag;
