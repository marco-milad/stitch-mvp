// "Active maintenance tickets" card — the resident's view of the admin
// dispatch pipeline.
//
//   • GET /api/v1/me/requests → TanStack Query, keyed ['me', 'requests'].
//   • WS  /api/v1/me/requests/stream:
//        - `snapshot` frame seeds the cache.
//        - `request.updated` events patch the matching row by id.
//
// When the status of a ticket flips (PENDING → IN_PROGRESS), the badge
// runs a `badge-flip` keyframe (scale + glow) and the technician card
// slides in from below using `tech-reveal`. The DOM key is just the
// ticket id; the animation is driven by tracking `prevStatus` per id and
// re-mounting the badge subtree via `key={status}`.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Plus, Radio, Wrench, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Skeleton } from '@/components/ui/Skeleton';
import {
  createMyTicket,
  listMyTickets,
  listTechnicianRoster,
  subscribeMyTickets,
  type MaintenanceTicket,
  type TicketCategory,
  type TicketCreateInput,
  type TicketStatus,
  type TicketTechnician,
  type TicketUrgency,
} from '@/lib/residentApi';

const STATUS_TONE: Record<TicketStatus, { bg: string; fg: string; ring: string }> = {
  pending: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    fg: 'text-amber-700 dark:text-amber-300',
    ring: 'ring-amber-200/60',
  },
  in_progress: {
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    fg: 'text-violet-700 dark:text-violet-300',
    ring: 'ring-violet-200/60',
  },
  resolved: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    fg: 'text-emerald-700 dark:text-emerald-300',
    ring: 'ring-emerald-200/60',
  },
};

const URGENCY_TONE: Record<MaintenanceTicket['urgency'], { bg: string; fg: string }> = {
  routine: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    fg: 'text-emerald-700 dark:text-emerald-300',
  },
  priority: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    fg: 'text-amber-700 dark:text-amber-300',
  },
  urgent: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    fg: 'text-red-700 dark:text-red-300',
  },
};

function fmtRelative(iso: string, lang: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return lang === 'ar' ? 'دلوقتي' : 'just now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
}

const QUERY_KEY = ['me', 'requests'] as const;

export function MyMaintenanceTickets() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [isLive, setIsLive] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Auto-dismiss toast after 3.5s.
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const ticketsQuery = useQuery<MaintenanceTicket[]>({
    queryKey: QUERY_KEY,
    queryFn: listMyTickets,
    staleTime: 30_000,
  });

  const techsQuery = useQuery<TicketTechnician[]>({
    queryKey: ['me', 'tickets', 'techs'],
    queryFn: listTechnicianRoster,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    const sub = subscribeMyTickets((event) => {
      if (event.type === 'snapshot') {
        qc.setQueryData<MaintenanceTicket[]>(QUERY_KEY, event.items);
      } else if (event.type === 'request.updated') {
        // Backend's `/me/requests/stream` is pre-filtered to this
        // resident, so any incoming update is for us. Prepend if new
        // (e.g. ticket created in another tab); patch in place if known.
        qc.setQueryData<MaintenanceTicket[] | undefined>(QUERY_KEY, (prev) => {
          if (!prev) return [event.item];
          const has = prev.some((r) => r.id === event.item.id);
          return has
            ? prev.map((r) => (r.id === event.item.id ? event.item : r))
            : [event.item, ...prev];
        });
      }
    }, setIsLive);
    return () => sub.close();
  }, [qc]);

  const techsById = useMemo(() => {
    const m = new Map<string, TicketTechnician>();
    (techsQuery.data ?? []).forEach((tech) => m.set(tech.id, tech));
    return m;
  }, [techsQuery.data]);

  // Show everything — non-resolved at the top (by openedAt desc), then
  // resolved tickets (by updatedAt desc) so a freshly-resolved card stays
  // visible in place while its badge transitions. Without this, an admin
  // resolve makes the card vanish before the user sees the green flip.
  const activeTickets = useMemo(() => {
    const all = ticketsQuery.data ?? [];
    const open = all
      .filter((r) => r.status !== 'resolved')
      .sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1));
    const done = all
      .filter((r) => r.status === 'resolved')
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    return [...open, ...done];
  }, [ticketsQuery.data]);

  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2 gap-3">
        <div className="flex flex-col min-w-0">
          <h2 className="text-sm font-extrabold text-ink-900 dark:text-white leading-tight">
            {t('myTickets.title')}
          </h2>
          <span className="text-[11px] text-ink-500 truncate">{t('myTickets.subtitle')}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <LivePill connected={isLive} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setCreatorOpen(true)}
        className="mb-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold shadow-md shadow-brand-500/30 active:scale-[0.99] transition-transform"
      >
        <Plus size={16} />
        <span>{t('myTickets.newRequest')}</span>
      </button>

      {toast && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-200 text-xs font-semibold animate-ticket-in">
          <CheckCircle2 size={14} />
          <span className="flex-1">{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            className="opacity-70 hover:opacity-100"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {ticketsQuery.isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-ink-700 rounded-2xl p-3.5 border border-ink-100 dark:border-ink-700 flex flex-row items-start gap-3"
            >
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : activeTickets.length === 0 ? (
        <div className="bg-white dark:bg-ink-700 rounded-2xl p-6 text-center text-xs text-ink-500">
          {t('myTickets.empty')}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {activeTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              tech={ticket.assigneeId ? (techsById.get(ticket.assigneeId) ?? null) : null}
              lang={i18n.language}
            />
          ))}
        </div>
      )}

      {creatorOpen && (
        <NewRequestModal
          onClose={() => setCreatorOpen(false)}
          onCreated={() => {
            setCreatorOpen(false);
            setToast(t('myTickets.toast.created'));
            qc.invalidateQueries({ queryKey: QUERY_KEY });
          }}
        />
      )}
    </section>
  );
}

function LivePill({ connected }: { connected: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider border',
        connected
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-ink-100 border-ink-200 text-ink-500',
      ].join(' ')}
    >
      <Radio size={10} />
      {connected ? t('myTickets.live') : t('myTickets.offline')}
    </span>
  );
}

function TicketCard({
  ticket,
  tech,
  lang,
}: {
  ticket: MaintenanceTicket;
  tech: TicketTechnician | null;
  lang: string;
}) {
  const { t } = useTranslation();

  // Track previous status so we only animate on real transitions, and pick
  // the emerald flip variant when the new status is `resolved` (violet glow
  // is reserved for dispatch).
  const prevStatusRef = useRef<TicketStatus>(ticket.status);
  const [didFlip, setDidFlip] = useState(false);

  useEffect(() => {
    if (prevStatusRef.current !== ticket.status) {
      prevStatusRef.current = ticket.status;
      setDidFlip(true);
      const id = setTimeout(() => setDidFlip(false), 800);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [ticket.status]);

  const statusTone = STATUS_TONE[ticket.status];
  const urgencyTone = URGENCY_TONE[ticket.urgency];
  const flipClass = didFlip
    ? ticket.status === 'resolved'
      ? 'animate-badge-flip-resolved'
      : 'animate-badge-flip'
    : '';

  return (
    <div className="bg-white dark:bg-ink-700 rounded-2xl p-3.5 border border-ink-100 dark:border-ink-700 animate-ticket-in">
      <div className="flex flex-row items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-700/30 flex items-center justify-center flex-shrink-0">
          <Wrench size={18} className="text-brand-600 dark:text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-row items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink-900 dark:text-white line-clamp-1">
                {ticket.title ?? t(`myTickets.category.${ticket.category}`)}
              </p>
              {ticket.title && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 mt-0.5">
                  {t(`myTickets.category.${ticket.category}`)}
                </p>
              )}
              <p className="text-[12px] text-ink-700 dark:text-ink-100 leading-snug mt-0.5 line-clamp-2">
                {ticket.summary}
              </p>
            </div>
            <span
              key={ticket.status}
              className={[
                'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ring-1 flex-shrink-0',
                statusTone.bg,
                statusTone.fg,
                statusTone.ring,
                flipClass,
              ].join(' ')}
            >
              {t(`myTickets.status.${ticket.status}`)}
            </span>
          </div>

          <div className="mt-2 flex flex-row items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${urgencyTone.bg} ${urgencyTone.fg}`}
            >
              {t(`myTickets.urgency.${ticket.urgency}`)}
            </span>
            <span className="text-[11px] text-ink-500 tabular-nums">
              · {t('myTickets.opened', { time: fmtRelative(ticket.openedAt, lang) })}
            </span>
          </div>

          {tech && ticket.status === 'in_progress' && (
            <div
              key={tech.id}
              className="mt-3 flex flex-row items-center gap-2.5 px-3 py-2 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/50 animate-tech-reveal"
            >
              <div className="w-7 h-7 rounded-full bg-violet-200 dark:bg-violet-700 flex items-center justify-center text-violet-700 dark:text-violet-200 text-[11px] font-bold flex-shrink-0">
                {tech.name
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300">
                  {t('myTickets.assignee.label')}
                </div>
                <div className="text-xs font-semibold text-ink-900 dark:text-white truncate">
                  {t('myTickets.assignee.specialty', {
                    specialty: t(`myTickets.category.${tech.specialty}`),
                    name: tech.name,
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New-request modal ────────────────────────────────────────────────

const CATEGORY_OPTIONS: readonly TicketCategory[] = [
  'plumbing',
  'electrical',
  'cleaning',
  'ac',
  'pest',
  'other',
];

const URGENCY_OPTIONS: readonly TicketUrgency[] = ['routine', 'priority', 'urgent'];

interface NewRequestModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function NewRequestModal({ onClose, onCreated }: NewRequestModalProps) {
  const { t } = useTranslation();

  const [category, setCategory] = useState<TicketCategory>('plumbing');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<TicketUrgency>('routine');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: TicketCreateInput) => createMyTicket(input),
    onSuccess: () => onCreated(),
    onError: (e: Error) => setError(t('myTickets.errors.createFailed', { message: e.message })),
  });

  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && !mutation.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setError(null);
    mutation.mutate({
      category,
      title: title.trim(),
      description: description.trim(),
      urgency,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-3 animate-qr-rise"
      onClick={(e) => {
        if (e.target === e.currentTarget && !mutation.isPending) onClose();
      }}
    >
      <div className="w-full max-w-md bg-white dark:bg-ink-900 rounded-2xl border border-ink-200 dark:border-ink-700 shadow-2xl flex flex-col max-h-[90vh]">
        <header className="flex items-center justify-between px-5 py-4 border-b border-ink-100 dark:border-ink-700">
          <div className="flex flex-col">
            <h2 className="text-base font-extrabold text-ink-900 dark:text-white leading-tight">
              {t('myTickets.create.title')}
            </h2>
            <p className="text-[11px] text-ink-500 leading-tight">
              {t('myTickets.create.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            aria-label={t('myTickets.create.cancel')}
            className="p-1.5 rounded-lg text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-700 disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </header>

        <div className="px-5 py-4 flex flex-col gap-3 overflow-y-auto">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <ModalField label={t('myTickets.create.category')}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
              aria-label={t('myTickets.create.category')}
              className="w-full px-3 py-2.5 rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-sm text-ink-900 dark:text-white"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {t(`myTickets.category.${c}`)}
                </option>
              ))}
            </select>
          </ModalField>

          <ModalField label={t('myTickets.create.ticketTitle')}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('myTickets.create.ticketTitlePlaceholder')}
              maxLength={80}
              aria-label={t('myTickets.create.ticketTitle')}
              className="w-full px-3 py-2.5 rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-sm text-ink-900 dark:text-white"
            />
          </ModalField>

          <ModalField label={t('myTickets.create.description')}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('myTickets.create.descriptionPlaceholder')}
              rows={4}
              maxLength={2000}
              aria-label={t('myTickets.create.description')}
              className="w-full px-3 py-2.5 rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-sm text-ink-900 dark:text-white resize-none"
            />
          </ModalField>

          <ModalField label={t('myTickets.create.urgency')}>
            <div className="flex gap-2">
              {URGENCY_OPTIONS.map((u) => {
                const selected = urgency === u;
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUrgency(u)}
                    className={[
                      'flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold border',
                      selected
                        ? 'bg-brand-500 border-brand-500 text-white'
                        : 'bg-white dark:bg-ink-900 border-ink-200 dark:border-ink-700 text-ink-700 dark:text-white',
                    ].join(' ')}
                  >
                    {t(`myTickets.urgency.${u}`)}
                  </button>
                );
              })}
            </div>
          </ModalField>
        </div>

        <footer className="flex items-center gap-2 px-5 py-3 border-t border-ink-100 dark:border-ink-700">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl border border-ink-200 dark:border-ink-700 text-ink-700 dark:text-white text-sm font-semibold disabled:opacity-50"
          >
            {t('myTickets.create.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold disabled:opacity-40"
          >
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {mutation.isPending ? t('myTickets.create.submitting') : t('myTickets.create.submit')}
          </button>
        </footer>
      </div>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        {label}
      </span>
      {children}
    </label>
  );
}
