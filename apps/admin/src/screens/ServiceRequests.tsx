import { Loader2, Radio, UserCheck, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DrawCheck } from '@/components/DrawCheck';
import { PageHeader } from '@/components/PageHeader';
import { StatusPill } from '@/components/StatusPill';
import { useDispatchRequest, useResolveRequest, useServiceRequests } from '@/lib/useRequests';
import type { RequestStatus, ServiceRequest, Technician } from '@/lib/types';

type StatusFilter = 'all' | RequestStatus;

const STATUS_FILTERS: StatusFilter[] = ['all', 'pending', 'in_progress', 'resolved'];

const FILTER_LABEL_KEY: Record<StatusFilter, string> = {
  all: 'requests.filters.all',
  pending: 'requests.filters.pending',
  in_progress: 'requests.filters.inProgress',
  resolved: 'requests.filters.resolved',
};

function statusTone(status: RequestStatus): 'warning' | 'info' | 'success' {
  if (status === 'pending') return 'warning';
  if (status === 'resolved') return 'success';
  return 'info';
}

function urgencyTone(urgency: ServiceRequest['urgency']): 'success' | 'warning' | 'danger' {
  if (urgency === 'urgent') return 'danger';
  if (urgency === 'priority') return 'warning';
  return 'success';
}

function fmt(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function StreamPill({
  connected,
  labels,
}: {
  connected: boolean;
  labels: { live: string; offline: string };
}) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border',
        connected
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-ink-100 border-ink-200 text-ink-500',
      ].join(' ')}
    >
      <span
        className={[
          'w-1.5 h-1.5 rounded-full',
          connected ? 'bg-emerald-500 animate-pulse' : 'bg-ink-400',
        ].join(' ')}
      />
      {connected ? labels.live : labels.offline}
    </span>
  );
}

export function ServiceRequests() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isLive } = useServiceRequests();
  const dispatchMutation = useDispatchRequest();
  const resolveMutation = useResolveRequest();

  const requests = data?.items ?? [];
  const technicians = data?.technicians ?? [];

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [assignTarget, setAssignTarget] = useState<ServiceRequest | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Track rows that JUST flipped to dispatched / resolved so the
  // choreography (puck halo, DrawCheck stamp) only fires for the
  // actual transition, then clears. ~1.4s window matches the keyframe
  // durations + a small buffer.
  const [recentDispatch, setRecentDispatch] = useState<Set<string>>(() => new Set());
  const [recentResolve, setRecentResolve] = useState<Set<string>>(() => new Set());
  const clearTimers = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    const timers = clearTimers.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    };
  }, []);
  const markRecent = (set: 'dispatch' | 'resolve', requestId: string) => {
    const updater = set === 'dispatch' ? setRecentDispatch : setRecentResolve;
    updater((prev) => {
      const next = new Set(prev);
      next.add(requestId);
      return next;
    });
    const key = `${set}:${requestId}`;
    const existing = clearTimers.current.get(key);
    if (existing) window.clearTimeout(existing);
    const id = window.setTimeout(() => {
      updater((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
      clearTimers.current.delete(key);
    }, 1400);
    clearTimers.current.set(key, id);
  };

  const techsById = useMemo(() => {
    const m = new Map<string, Technician>();
    technicians.forEach((tech) => m.set(tech.id, tech));
    return m;
  }, [technicians]);

  const filtered = useMemo(() => {
    const rows = filter === 'all' ? requests : requests.filter((r) => r.status === filter);
    return [...rows].sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1));
  }, [requests, filter]);

  const handleDispatch = async (techId: string) => {
    if (!assignTarget) return;
    setActionError(null);
    const targetId = assignTarget.id;
    try {
      await dispatchMutation.mutateAsync({
        requestId: targetId,
        technicianId: techId,
      });
      markRecent('dispatch', targetId);
      setAssignTarget(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown error';
      setActionError(t('requests.errors.dispatch', { message: msg }));
    }
  };

  const handleResolve = async (requestId: string) => {
    setActionError(null);
    try {
      await resolveMutation.mutateAsync(requestId);
      markRecent('resolve', requestId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown error';
      setActionError(t('requests.errors.resolve', { message: msg }));
    }
  };

  const resolvingId = resolveMutation.isPending ? resolveMutation.variables : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('requests.title')} subtitle={t('requests.subtitle')} />

      {actionError && (
        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          {actionError}
        </div>
      )}

      <div className="flex flex-row items-center justify-between gap-3">
        <div className="flex flex-row items-center gap-2 overflow-x-auto no-scrollbar">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={[
                'px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap backdrop-blur-sm transition-all duration-300',
                filter === f
                  ? 'bg-gradient-to-br from-ink-800 to-ink-900 border-ink-900 text-white shadow-lg shadow-ink-900/30 scale-105'
                  : 'bg-white/60 border-white/50 text-ink-700 hover:bg-white/80 hover:scale-[1.04]',
              ].join(' ')}
            >
              {t(FILTER_LABEL_KEY[f])}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-ink-500">
          <Radio size={14} />
          <StreamPill
            connected={isLive}
            labels={{
              live: t('requests.stream.live'),
              offline: t('requests.stream.offline'),
            }}
          />
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-2xl shadow-ink-900/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/40 text-ink-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-start font-semibold px-4 py-3">{t('requests.table.id')}</th>
              <th className="text-start font-semibold px-4 py-3">{t('requests.table.resident')}</th>
              <th className="text-start font-semibold px-4 py-3">{t('requests.table.unit')}</th>
              <th className="text-start font-semibold px-4 py-3">{t('requests.table.category')}</th>
              <th className="text-start font-semibold px-4 py-3">{t('requests.table.urgency')}</th>
              <th className="text-start font-semibold px-4 py-3">{t('requests.table.status')}</th>
              <th className="text-start font-semibold px-4 py-3">{t('requests.table.assignee')}</th>
              <th className="text-start font-semibold px-4 py-3">{t('requests.table.openedAt')}</th>
              <th className="text-end font-semibold px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-ink-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    {t('requests.empty_loading')}
                  </span>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-ink-500">
                  {t('requests.empty')}
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const tech = r.assigneeId ? techsById.get(r.assigneeId) : null;
                const isResolving = resolvingId === r.id;
                const justDispatched = recentDispatch.has(r.id);
                const justResolved = recentResolve.has(r.id);
                const rowChoreography = justResolved
                  ? 'animate-row-resolve'
                  : justDispatched
                    ? 'shadow-[inset_0_0_24px_rgba(34,211,238,0.18)]'
                    : '';
                return (
                  <tr
                    key={r.id}
                    className={`border-t border-white/40 align-top hover:bg-white/40 transition-colors duration-200 ${rowChoreography}`}
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-ink-500">{r.id}</td>
                    <td className="px-4 py-3 font-medium text-ink-900">
                      {r.residentName}
                      <div className="text-[11px] text-ink-500 mt-0.5 line-clamp-2 max-w-[220px]">
                        {r.summary}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-700">{r.unit}</td>
                    <td className="px-4 py-3 text-ink-700">
                      {t(`requests.categories.${r.category}`)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={urgencyTone(r.urgency)}>
                        {t(`requests.urgency.${r.urgency}`)}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={statusTone(r.status)}>
                        {t(`requests.status.${r.status}`)}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-ink-700">{tech ? tech.name : '—'}</td>
                    <td className="px-4 py-3 text-ink-500 tabular-nums">
                      {fmt(r.openedAt, i18n.language)}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="inline-flex items-center gap-2">
                        {justResolved && <DrawCheck size={16} withRing />}
                        {r.status !== 'resolved' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setAssignTarget(r)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-brand-400/60 bg-white/50 text-brand-700 hover:bg-brand-50 hover:scale-105 hover:shadow-md hover:shadow-brand-500/30 active:scale-95 transition-all duration-200 ease-smooth"
                            >
                              <UserCheck size={12} />
                              {t('requests.actions.dispatch')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResolve(r.id)}
                              disabled={isResolving}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-emerald-400/60 bg-white/50 text-emerald-700 hover:bg-emerald-50 hover:scale-105 hover:shadow-md hover:shadow-emerald-500/30 active:scale-95 transition-all duration-200 ease-smooth disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                            >
                              {isResolving ? <Loader2 size={12} className="animate-spin" /> : null}
                              {isResolving
                                ? t('requests.actions.resolving')
                                : t('requests.actions.resolve')}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {assignTarget && (
        <DispatchModal
          target={assignTarget}
          technicians={technicians}
          onClose={() => setAssignTarget(null)}
          onPick={handleDispatch}
          isPending={dispatchMutation.isPending}
          pendingTechId={
            dispatchMutation.isPending ? (dispatchMutation.variables?.technicianId ?? null) : null
          }
        />
      )}
    </div>
  );
}

// ─── Dispatch modal ────────────────────────────────────────────────────────

function DispatchModal({
  target,
  technicians,
  onClose,
  onPick,
  isPending,
  pendingTechId,
}: {
  target: ServiceRequest;
  technicians: Technician[];
  onClose: () => void;
  onPick: (technicianId: string) => void;
  isPending: boolean;
  pendingTechId: string | null;
}) {
  const { t } = useTranslation();

  // Specialty match → first, ordered by load ascending (least busy first).
  const sortedTechs = useMemo(() => {
    const match = technicians
      .filter((tech) => tech.specialty === target.category)
      .sort((a, b) => a.load - b.load);
    const rest = technicians
      .filter((tech) => tech.specialty !== target.category)
      .sort((a, b) => a.load - b.load);
    return [...match, ...rest];
  }, [technicians, target.category]);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-rise-in">
      <div className="relative w-full max-w-md bg-white/85 backdrop-blur-xl rounded-2xl border border-white/60 shadow-2xl shadow-ink-900/20 ring-1 ring-white/30">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/40">
          <h2 className="text-sm font-bold text-ink-900">
            {t('requests.assign.title')} · {target.id}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1 rounded hover:bg-ink-100 text-ink-500 disabled:opacity-50"
            aria-label={t('common.cancel')}
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
          {sortedTechs.map((tech) => {
            const isMatch = tech.specialty === target.category;
            const isLoading = isPending && pendingTechId === tech.id;
            const disabled = isPending && !isLoading;
            return (
              <button
                key={tech.id}
                type="button"
                onClick={() => onPick(tech.id)}
                disabled={isPending}
                className={[
                  'relative flex items-center justify-between px-3 py-2.5 rounded-lg border text-start transition-all duration-200 ease-smooth',
                  isLoading
                    ? // Dispatch puck arriving — brand glow halo + animated ring
                      'border-brand-500 bg-brand-50 shadow-[0_0_24px_rgba(6,182,212,0.45)] scale-[1.02]'
                    : 'border-ink-100 hover:border-brand-500 hover:bg-brand-50 hover:scale-[1.02] hover:shadow-md hover:shadow-brand-500/20',
                  disabled ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}
              >
                <div className="text-start">
                  <div className="text-sm font-semibold text-ink-900">{tech.name}</div>
                  <div className="text-[11px] text-ink-500">
                    {t(`requests.categories.${tech.specialty}`)} · load {tech.load}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isMatch && <StatusPill tone="success">match</StatusPill>}
                  {isLoading && <Loader2 size={14} className="animate-spin text-brand-500" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
