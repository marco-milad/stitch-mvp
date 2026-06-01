import {
  AlertTriangle,
  Check,
  CheckCircle2,
  LogIn,
  LogOut,
  Radio,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { AnimatedCount } from '@/components/AnimatedCount';
import { PageHeader } from '@/components/PageHeader';
import { StatusPill } from '@/components/StatusPill';
import { useGateStream } from '@/lib/useGateStream';
import type { GateScanEvent, ParkingPermit, PermitStatus, VisitorQrScan } from '@/lib/types';
import { useGateStore } from '@/stores/gateStore';
import { useGateStreamStore } from '@/stores/gateStreamStore';

type Tab = 'live' | 'permits' | 'qr';

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtRange(fromIso: string, toIso: string, lang: string): string {
  const f = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
  return `${f.format(new Date(fromIso))} → ${f.format(new Date(toIso))}`;
}

function fmtTs(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function permitTone(status: PermitStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'approved') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'rejected') return 'danger';
  return 'neutral';
}

function qrTone(kind: VisitorQrScan['kind']): 'success' | 'info' | 'warning' | 'danger' {
  if (kind === 'in') return 'success';
  if (kind === 'out') return 'info';
  if (kind === 'guest') return 'warning';
  return 'danger';
}

// Same-day check using local TZ so "today" matches the operator's clock.
function isToday(iso: string, now: Date = new Date()): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

interface DerivedStats {
  entriesToday: number;
  activeGuestsInside: number;
  securityAlerts: number;
}

function deriveStats(events: GateScanEvent[]): DerivedStats {
  let entriesToday = 0;
  let securityAlerts = 0;
  let activeGuestsInside = 0;

  for (const e of events) {
    if (!isToday(e.timestamp)) continue;
    if (e.status === 'approved' && e.direction === 'in') entriesToday += 1;
    if (e.status === 'denied' || e.status === 'expired') securityAlerts += 1;

    // Running tally of guests inside — relies on the ring buffer covering
    // the same day. For demo loads (last 60 events) this is good enough.
    if (e.visitorKind !== 'resident' && e.status === 'approved') {
      activeGuestsInside += e.direction === 'in' ? 1 : -1;
    }
  }

  return {
    entriesToday,
    activeGuestsInside: Math.max(activeGuestsInside, 0),
    securityAlerts,
  };
}

// ─── Stream-row visual variant resolution ──────────────────────────────────

type Variant = 'glint' | 'wave' | 'alert';

function variantFor(event: GateScanEvent): Variant {
  if (event.status === 'denied' || event.status === 'expired') return 'alert';
  if (event.direction === 'out') return 'wave';
  return 'glint';
}

// ─── Components ────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  tone: 'brand' | 'accent' | 'danger';
}) {
  const accent =
    tone === 'brand'
      ? 'from-brand-500/15 to-brand-500/0 text-brand-700 ring-brand-500/30'
      : tone === 'accent'
        ? 'from-accent/15 to-accent/0 text-accent ring-accent/30'
        : 'from-red-500/15 to-red-500/0 text-red-700 ring-red-500/30';
  return (
    <div
      className={`flex-1 min-w-[220px] rounded-2xl border border-ink-100 bg-white p-4 relative overflow-hidden`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} pointer-events-none`} />
      <div className="relative flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            {label}
          </div>
          <div className="text-3xl font-extrabold text-ink-900 tabular-nums leading-none">
            {typeof value === 'number' ? <AnimatedCount value={value} /> : value}
          </div>
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ring-1 ${accent}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function StreamPill({
  connected,
  label,
}: {
  connected: boolean;
  label: { live: string; offline: string };
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
      {connected ? label.live : label.offline}
    </span>
  );
}

function VariantIcon({ variant }: { variant: Variant }) {
  const base = 'w-10 h-10 rounded-xl flex items-center justify-center text-white relative';
  if (variant === 'alert') {
    return (
      <div className={`${base} bg-red-500 animate-alert-pulse`}>
        <ShieldAlert size={18} />
      </div>
    );
  }
  if (variant === 'wave') {
    return (
      <div className={`${base} bg-brand-500 animate-wave`}>
        <LogOut size={18} />
      </div>
    );
  }
  return (
    <div className={`${base} bg-emerald-500 animate-glint`}>
      <CheckCircle2 size={18} />
    </div>
  );
}

function relativeTime(iso: string, now: number, lang: string): string {
  const diffSec = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (diffSec < 5) return lang === 'ar' ? 'دلوقتي' : 'just now';
  if (diffSec < 60) return `${diffSec}s`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  return `${hr}h`;
}

function ScanRow({ event, now }: { event: GateScanEvent; now: number }) {
  const { t, i18n } = useTranslation();
  const variant = variantFor(event);
  const ringClass =
    variant === 'alert'
      ? 'ring-red-200 bg-white animate-alert-flash'
      : variant === 'wave'
        ? 'ring-brand-100 bg-white'
        : 'ring-emerald-100 bg-white';

  const headlineKey =
    event.status === 'denied'
      ? 'gate.live.row.denied'
      : event.status === 'expired'
        ? 'gate.live.row.expired'
        : event.direction === 'in'
          ? 'gate.live.row.approvedIn'
          : 'gate.live.row.approvedOut';

  return (
    <li
      className={`relative animate-scan-slide-in rounded-xl ring-1 ${ringClass} px-3 py-3 flex flex-row items-center gap-3`}
    >
      <VariantIcon variant={variant} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-row items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-ink-900 truncate">{event.visitorName}</span>
          <StatusPill
            tone={
              event.status === 'approved'
                ? 'success'
                : event.status === 'denied'
                  ? 'danger'
                  : 'warning'
            }
          >
            {t(`gate.live.visitorKind.${event.visitorKind}`)}
          </StatusPill>
          <span className="text-[11px] text-ink-500">
            {t(`gate.live.gate.${event.gate}`)} · {t(`gate.live.zone.${event.zone}`)}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-ink-700 line-clamp-1">
          <span className="font-semibold">{t(headlineKey)}</span>
          {event.unit ? ` · ${event.unit}` : ''}
          {event.hostName ? ` · ${t('gate.live.row.host')} ${event.hostName}` : ''}
        </div>
        {event.note && (
          <div className="mt-0.5 text-[11px] text-red-600 flex items-center gap-1">
            <AlertTriangle size={11} />
            {event.note}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end shrink-0 gap-1">
        <span className="font-mono text-[10px] text-ink-500">{event.code}</span>
        <span className="text-[11px] text-ink-500 tabular-nums">
          {relativeTime(event.timestamp, now, i18n.language)}
        </span>
      </div>
    </li>
  );
}

function LiveStream() {
  const { t } = useTranslation();
  useGateStream();
  const events = useGateStreamStore((s) => s.events);
  const connected = useGateStreamStore((s) => s.connected);

  // Re-render every 5s so the "relative time" labels in each row tick.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

  const stats = useMemo(() => deriveStats(events), [events]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio size={16} className="text-emerald-600" />
          <h2 className="text-sm font-bold text-ink-900">{t('gate.live.title')}</h2>
        </div>
        <StreamPill
          connected={connected}
          label={{ live: t('gate.live.connected'), offline: t('gate.live.offline') }}
        />
      </div>

      <div className="flex flex-row flex-wrap gap-3">
        <StatCard
          icon={<LogIn size={18} />}
          label={t('gate.live.scoreboard.entriesToday')}
          value={stats.entriesToday}
          tone="brand"
        />
        <StatCard
          icon={<Users size={18} />}
          label={t('gate.live.scoreboard.activeGuests')}
          value={stats.activeGuestsInside}
          tone="accent"
        />
        <StatCard
          icon={<ShieldAlert size={18} />}
          label={t('gate.live.scoreboard.alerts')}
          value={stats.securityAlerts}
          tone="danger"
        />
      </div>

      <div className="bg-gradient-to-b from-ink-900 to-ink-800 rounded-2xl p-4 max-h-[60vh] overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-ink-300 text-sm">
            {t('gate.live.waiting')}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {events.map((event) => (
              <ScanRow key={event.id} event={event} now={now} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Top-level screen ─────────────────────────────────────────────────────

export function GateOps() {
  const { t, i18n } = useTranslation();
  const permits = useGateStore((s) => s.permits);
  const qrScans = useGateStore((s) => s.qrScans);
  const setPermitStatus = useGateStore((s) => s.setPermitStatus);

  const [tab, setTab] = useState<Tab>('live');

  const sortedPermits = useMemo<ParkingPermit[]>(() => {
    const order: PermitStatus[] = ['pending', 'approved', 'rejected', 'expired'];
    return [...permits].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  }, [permits]);

  const sortedQr = useMemo<VisitorQrScan[]>(
    () => [...qrScans].sort((a, b) => (a.scannedAt < b.scannedAt ? 1 : -1)),
    [qrScans],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('gate.title')} subtitle={t('gate.subtitle')} />

      <div className="inline-flex gap-1 p-1 bg-ink-100 rounded-lg self-start">
        {(['live', 'permits', 'qr'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={[
              'px-4 py-1.5 rounded-md text-xs font-semibold',
              tab === k ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500',
            ].join(' ')}
          >
            {t(`gate.tabs.${k}`)}
          </button>
        ))}
      </div>

      {tab === 'live' && <LiveStream />}

      {tab === 'permits' && (
        <div className="bg-white rounded-2xl border border-ink-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-start font-semibold px-4 py-3">
                  {t('gate.permits.table.resident')}
                </th>
                <th className="text-start font-semibold px-4 py-3">
                  {t('gate.permits.table.unit')}
                </th>
                <th className="text-start font-semibold px-4 py-3">
                  {t('gate.permits.table.vehicle')}
                </th>
                <th className="text-start font-semibold px-4 py-3">
                  {t('gate.permits.table.plate')}
                </th>
                <th className="text-start font-semibold px-4 py-3">
                  {t('gate.permits.table.validity')}
                </th>
                <th className="text-start font-semibold px-4 py-3">
                  {t('gate.permits.table.status')}
                </th>
                <th className="text-end font-semibold px-4 py-3">
                  {t('gate.permits.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPermits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-ink-500">
                    {t('gate.permits.empty')}
                  </td>
                </tr>
              ) : (
                sortedPermits.map((p) => (
                  <tr key={p.id} className="border-t border-ink-100">
                    <td className="px-4 py-3 font-medium text-ink-900">{p.residentName}</td>
                    <td className="px-4 py-3 text-ink-700">{p.unit}</td>
                    <td className="px-4 py-3 text-ink-700">{p.vehicleMake}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-ink-700">
                      {p.vehiclePlate}
                    </td>
                    <td className="px-4 py-3 text-ink-500 tabular-nums">
                      {fmtRange(p.validFrom, p.validTo, i18n.language)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={permitTone(p.status)}>
                        {t(`gate.permits.status.${p.status}`)}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-end">
                      {p.status === 'pending' ? (
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPermitStatus(p.id, 'approved')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                          >
                            <Check size={12} />
                            {t('common.approve')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPermitStatus(p.id, 'rejected')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-red-500 text-red-700 hover:bg-red-50"
                          >
                            <X size={12} />
                            {t('common.reject')}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-ink-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'qr' && (
        <div className="bg-white rounded-2xl border border-ink-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-start font-semibold px-4 py-3">{t('gate.qr.table.code')}</th>
                <th className="text-start font-semibold px-4 py-3">{t('gate.qr.table.host')}</th>
                <th className="text-start font-semibold px-4 py-3">{t('gate.qr.table.unit')}</th>
                <th className="text-start font-semibold px-4 py-3">{t('gate.qr.table.visitor')}</th>
                <th className="text-start font-semibold px-4 py-3">{t('gate.qr.table.kind')}</th>
                <th className="text-start font-semibold px-4 py-3">
                  {t('gate.qr.table.scannedAt')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedQr.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink-500">
                    {t('gate.qr.empty')}
                  </td>
                </tr>
              ) : (
                sortedQr.map((s) => (
                  <tr key={s.id} className="border-t border-ink-100">
                    <td className="px-4 py-3 font-mono text-[11px] text-ink-700">{s.code}</td>
                    <td className="px-4 py-3 text-ink-900 font-medium">{s.hostName}</td>
                    <td className="px-4 py-3 text-ink-700">{s.unit}</td>
                    <td className="px-4 py-3 text-ink-700">{s.visitorName}</td>
                    <td className="px-4 py-3">
                      <StatusPill tone={qrTone(s.kind)}>{t(`gate.qr.kinds.${s.kind}`)}</StatusPill>
                    </td>
                    <td className="px-4 py-3 text-ink-500 tabular-nums">
                      {fmtTs(s.scannedAt, i18n.language)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
