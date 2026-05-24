// Visitor QR + Parking booking — the resident's gate-control screen.
// Two stacked sections in one scrollable view:
//   • Visitor pass: form → POST → high-fidelity QR card + WhatsApp share.
//     Server-side, issuing a pass also fires a synthetic gate event so the
//     admin's Live Stream lights up within ~50ms.
//   • Parking: zone-filtered slot grid, tap-to-book, release-your-own.
//
// Both halves run on TanStack Query. The QR card uses the existing
// `QrPattern` for the visual — it's deterministic on the code so the same
// pass always renders the same pattern.

import {
  ArrowLeft,
  CarFront,
  Loader2,
  ParkingCircle,
  Sparkles,
  Truck,
  UserPlus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { QrPattern } from '@/components/qr/QrPattern';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  bookParkingSlot,
  createVisitorPass,
  listMyBookings,
  listParkingSlots,
  listVisitorPasses,
  releaseParkingBooking,
  type ParkingBooking,
  type ParkingSlot,
  type ParkingZone,
  type VehicleKind,
  type VisitorPass,
} from '@/lib/residentApi';

// ─── Helpers ────────────────────────────────────────────────────────────

function localIsoNow(offsetMinutes = 0): string {
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  return d.toISOString();
}

function toInputValue(iso: string): string {
  // <input type="datetime-local"> wants `YYYY-MM-DDTHH:mm` in *local* time.
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromInputValue(local: string): string {
  return new Date(local).toISOString();
}

function fmtTime(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function fmtDateTime(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function seedFromCode(code: string): number {
  let h = 0;
  for (let i = 0; i < code.length; i++) {
    h = (h * 31 + code.charCodeAt(i)) >>> 0;
  }
  return h || 1;
}

// ─── Top-level screen ──────────────────────────────────────────────────

type Tab = 'visitor' | 'parking';

export function HomeParking() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('visitor');

  return (
    <div className="min-h-full bg-ink-50 dark:bg-ink-900 flex flex-col">
      <header className="bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-700 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label={t('homeParking.back')}
          className="p-2 -ms-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700"
        >
          <ArrowLeft size={22} className="text-ink-700 dark:text-white rtl:rotate-180" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-ink-900 dark:text-white leading-tight truncate">
            {t('homeParking.title')}
          </h1>
          <p className="text-[11px] text-ink-500 leading-tight truncate">
            {t('homeParking.subtitle')}
          </p>
        </div>
      </header>

      <div className="px-3 py-3">
        <div className="inline-flex gap-1 p-1 bg-ink-100 dark:bg-ink-700 rounded-lg">
          {(['visitor', 'parking'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={[
                'px-4 py-1.5 rounded-md text-xs font-semibold',
                tab === k
                  ? 'bg-white dark:bg-ink-900 text-ink-900 dark:text-white shadow-sm'
                  : 'text-ink-500 dark:text-ink-100',
              ].join(' ')}
            >
              {t(`homeParking.tabs.${k}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-12">
        {tab === 'visitor' ? <VisitorPassSection /> : <ParkingSection />}
      </div>
    </div>
  );
}

// ─── Visitor pass section ──────────────────────────────────────────────

interface DraftPass {
  visitorName: string;
  vehicleKind: VehicleKind;
  validFrom: string; // local datetime-input string
  validTo: string;
  note: string;
}

function emptyDraft(): DraftPass {
  return {
    visitorName: '',
    vehicleKind: 'car',
    validFrom: toInputValue(localIsoNow(0)),
    validTo: toInputValue(localIsoNow(180)),
    note: '',
  };
}

const VEHICLE_KINDS: Array<{ id: VehicleKind; Icon: typeof CarFront }> = [
  { id: 'car', Icon: CarFront },
  { id: 'delivery', Icon: Truck },
  { id: 'rideshare', Icon: UserPlus },
];

export function VisitorPassSection() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<DraftPass>(emptyDraft);
  const [issued, setIssued] = useState<VisitorPass | null>(null);
  const [error, setError] = useState<string | null>(null);

  const passesQuery = useQuery({
    queryKey: ['me', 'visitor-passes'],
    queryFn: () => listVisitorPasses(),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: createVisitorPass,
    onSuccess: (pass) => {
      setIssued(pass);
      qc.invalidateQueries({ queryKey: ['me', 'visitor-passes'] });
    },
    onError: (e: Error) => {
      setError(t('homeParking.visitor.errors.createFailed', { message: e.message }));
    },
  });

  const canSubmit =
    draft.visitorName.trim().length > 0 &&
    draft.validFrom &&
    draft.validTo &&
    !createMutation.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    try {
      await createMutation.mutateAsync({
        visitorName: draft.visitorName.trim(),
        vehicleKind: draft.vehicleKind,
        validFrom: fromInputValue(draft.validFrom),
        validTo: fromInputValue(draft.validTo),
        note: draft.note.trim() || undefined,
      });
    } catch {
      // error already surfaced via onError handler
    }
  };

  const handleIssueAnother = () => {
    setIssued(null);
    setError(null);
    setDraft(emptyDraft());
  };

  if (issued) {
    return (
      <PassResultCard pass={issued} onIssueAnother={handleIssueAnother} lang={i18n.language} />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white dark:bg-ink-700 rounded-2xl border border-ink-100 dark:border-ink-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-brand-500" />
          <h2 className="text-sm font-bold text-ink-900 dark:text-white">
            {t('homeParking.visitor.form.title')}
          </h2>
        </div>
        <p className="text-xs text-ink-500 mb-4">{t('homeParking.visitor.form.subtitle')}</p>

        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <FormField label={t('homeParking.visitor.form.name')}>
            <input
              value={draft.visitorName}
              onChange={(e) => setDraft({ ...draft, visitorName: e.target.value })}
              placeholder={t('homeParking.visitor.form.namePlaceholder')}
              className="w-full px-3 py-2.5 rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-sm text-ink-900 dark:text-white"
            />
          </FormField>

          <FormField label={t('homeParking.visitor.form.kind')}>
            <div className="flex gap-2">
              {VEHICLE_KINDS.map(({ id, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDraft({ ...draft, vehicleKind: id })}
                  className={[
                    'flex-1 flex flex-col items-center gap-1 px-2 py-3 rounded-lg border text-xs font-semibold',
                    draft.vehicleKind === id
                      ? 'bg-brand-500 border-brand-500 text-white'
                      : 'bg-white dark:bg-ink-900 border-ink-200 dark:border-ink-700 text-ink-700 dark:text-white',
                  ].join(' ')}
                >
                  <Icon size={18} />
                  <span>{t(`homeParking.visitor.kinds.${id}`)}</span>
                </button>
              ))}
            </div>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('homeParking.visitor.form.validFrom')}>
              <input
                type="datetime-local"
                value={draft.validFrom}
                onChange={(e) => setDraft({ ...draft, validFrom: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-sm text-ink-900 dark:text-white"
              />
            </FormField>
            <FormField label={t('homeParking.visitor.form.validTo')}>
              <input
                type="datetime-local"
                value={draft.validTo}
                onChange={(e) => setDraft({ ...draft, validTo: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-sm text-ink-900 dark:text-white"
              />
            </FormField>
          </div>

          <FormField label={t('homeParking.visitor.form.note')}>
            <input
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-sm text-ink-900 dark:text-white"
            />
          </FormField>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="mt-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold shadow-sm"
          >
            {createMutation.isPending && <Loader2 size={16} className="animate-spin" />}
            {createMutation.isPending
              ? t('homeParking.visitor.form.issuing')
              : t('homeParking.visitor.form.issue')}
          </button>
        </div>
      </div>

      <RecentPasses
        passes={passesQuery.data?.items ?? []}
        isLoading={passesQuery.isLoading}
        lang={i18n.language}
      />
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function PassResultCard({
  pass,
  onIssueAnother,
  lang,
}: {
  pass: VisitorPass;
  onIssueAnother: () => void;
  lang: string;
}) {
  const { t } = useTranslation();
  const seed = useMemo(() => seedFromCode(pass.code), [pass.code]);
  const validFrom = fmtTime(pass.validFrom, lang);
  const validTo = fmtTime(pass.validTo, lang);

  const shareText = t('homeParking.visitor.result.whatsappText', {
    name: pass.visitorName,
    code: pass.code,
    from: validFrom,
    to: validTo,
  });
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="flex flex-col gap-3 animate-qr-rise">
      <div className="bg-gradient-to-br from-brand-500 to-accent rounded-3xl p-5 text-white shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
              {t('homeParking.visitor.result.title')}
            </span>
            <span className="text-xs text-white/85">
              {t('homeParking.visitor.result.subtitle')}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold tracking-wider">
            {t(`homeParking.visitor.kinds.${pass.vehicleKind}`)}
          </span>
        </div>

        <div className="flex justify-center my-4">
          <div className="p-2 rounded-2xl bg-white animate-qr-shimmer">
            <QrPattern seed={seed} size={220} brightness />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="text-lg font-extrabold tracking-tight">{pass.visitorName}</div>
          <div className="font-mono text-sm bg-white/15 px-3 py-1 rounded-md tracking-widest">
            {pass.code}
          </div>
          <div className="text-[11px] text-white/85 mt-1">
            {t('homeParking.visitor.result.validity', {
              from: validFrom,
              to: validTo,
            })}
          </div>
        </div>
      </div>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold"
      >
        {t('homeParking.visitor.result.share')}
      </a>

      <button
        type="button"
        onClick={onIssueAnother}
        className="px-4 py-2.5 rounded-xl border border-ink-200 dark:border-ink-700 text-ink-700 dark:text-white text-sm font-semibold hover:bg-ink-100 dark:hover:bg-ink-700"
      >
        {t('homeParking.visitor.result.issueAnother')}
      </button>
    </div>
  );
}

function RecentPasses({
  passes,
  isLoading,
  lang,
}: {
  passes: VisitorPass[];
  isLoading: boolean;
  lang: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-ink-700 rounded-2xl border border-ink-100 dark:border-ink-700 p-4">
      <h3 className="text-sm font-bold text-ink-900 dark:text-white mb-2">
        {t('homeParking.visitor.history.title')}
      </h3>
      {isLoading ? (
        <div className="py-4 text-center text-xs text-ink-500">
          <Loader2 size={14} className="inline-block animate-spin me-2" />
        </div>
      ) : passes.length === 0 ? (
        <p className="text-xs text-ink-500 py-3 text-center">
          {t('homeParking.visitor.history.empty')}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-ink-100 dark:divide-ink-700">
          {passes.slice(0, 5).map((p) => (
            <li key={p.id} className="py-2.5 flex flex-row items-center gap-3 animate-ticket-in">
              <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-700/30 flex items-center justify-center flex-shrink-0">
                <Sparkles size={14} className="text-brand-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ink-900 dark:text-white truncate">
                  {p.visitorName}
                </div>
                <div className="text-[11px] text-ink-500 tabular-nums truncate">
                  {p.code} · {fmtDateTime(p.validFrom, lang)} → {fmtTime(p.validTo, lang)}
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-ink-100 dark:bg-ink-600 text-ink-700 dark:text-ink-100">
                {t(`homeParking.visitor.kinds.${p.vehicleKind}`)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Parking section ───────────────────────────────────────────────────

const ZONE_FILTERS: Array<ParkingZone | 'all'> = ['all', 'phase1', 'sarai', 'tajSultan'];

export function ParkingSection() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [zoneFilter, setZoneFilter] = useState<ParkingZone | 'all'>('all');
  const [bookingTarget, setBookingTarget] = useState<ParkingSlot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slotsQuery = useQuery({
    queryKey: ['me', 'parking', 'slots'],
    queryFn: () => listParkingSlots(),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const myBookingsQuery = useQuery({
    queryKey: ['me', 'parking', 'bookings'],
    queryFn: () => listMyBookings(),
    staleTime: 15_000,
  });

  const bookMutation = useMutation({
    mutationFn: bookParkingSlot,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me', 'parking', 'slots'] });
      qc.invalidateQueries({ queryKey: ['me', 'parking', 'bookings'] });
      setBookingTarget(null);
    },
    onError: (e: Error) => {
      setError(t('homeParking.parking.errors.bookFailed', { message: e.message }));
    },
  });

  const releaseMutation = useMutation({
    mutationFn: releaseParkingBooking,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me', 'parking', 'slots'] });
      qc.invalidateQueries({ queryKey: ['me', 'parking', 'bookings'] });
    },
  });

  const slots = slotsQuery.data?.items ?? [];
  const filteredSlots = useMemo(() => {
    if (zoneFilter === 'all') return slots;
    return slots.filter((s) => s.zone === zoneFilter);
  }, [slots, zoneFilter]);

  const myBookings = myBookingsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white dark:bg-ink-700 rounded-2xl border border-ink-100 dark:border-ink-700 p-4">
        <div className="flex items-center gap-2 mb-1">
          <ParkingCircle size={16} className="text-accent" />
          <h2 className="text-sm font-bold text-ink-900 dark:text-white">
            {t('homeParking.tabs.parking')}
          </h2>
        </div>
        <p className="text-xs text-ink-500 mb-4">{t('homeParking.parking.intro')}</p>

        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-row gap-2 mb-4 overflow-x-auto no-scrollbar">
          {ZONE_FILTERS.map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZoneFilter(z)}
              className={[
                'px-3 py-1.5 rounded-full text-[11px] font-semibold border whitespace-nowrap',
                zoneFilter === z
                  ? 'bg-ink-900 border-ink-900 text-white'
                  : 'bg-white dark:bg-ink-900 border-ink-200 dark:border-ink-700 text-ink-700 dark:text-white',
              ].join(' ')}
            >
              {t(`homeParking.parking.zones.${z}`)}
            </button>
          ))}
        </div>

        {slotsQuery.isLoading && filteredSlots.length === 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filteredSlots.map((slot) => (
              <SlotTile
                key={slot.id}
                slot={slot}
                onClick={() => {
                  if (slot.status === 'reserved_other') return;
                  if (slot.status === 'reserved_self') return;
                  setBookingTarget(slot);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-ink-700 rounded-2xl border border-ink-100 dark:border-ink-700 p-4">
        <h3 className="text-sm font-bold text-ink-900 dark:text-white mb-3">
          {t('homeParking.parking.mine.title')}
        </h3>
        {myBookings.length === 0 ? (
          <p className="text-xs text-ink-500 text-center py-3">
            {t('homeParking.parking.mine.empty')}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-ink-100 dark:divide-ink-700">
            {myBookings.map((b) => (
              <li key={b.id} className="py-2.5 flex flex-row items-center gap-3 animate-ticket-in">
                <div className="w-9 h-9 rounded-lg bg-accent/10 dark:bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <ParkingCircle size={14} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink-900 dark:text-white">
                    {b.slotLabel} · {t(`homeParking.parking.zones.${b.zone}`)}
                  </div>
                  <div className="text-[11px] text-ink-500 truncate">
                    {t('homeParking.parking.mine.until', {
                      time: fmtDateTime(b.until, i18n.language),
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => releaseMutation.mutate(b.id)}
                  disabled={releaseMutation.isPending && releaseMutation.variables === b.id}
                  className="px-3 py-1.5 rounded-md text-[11px] font-semibold border border-red-500 text-red-700 hover:bg-red-50 disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {releaseMutation.isPending && releaseMutation.variables === b.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : null}
                  {releaseMutation.isPending && releaseMutation.variables === b.id
                    ? t('homeParking.parking.book.releasing')
                    : t('homeParking.parking.book.release')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {bookingTarget && (
        <BookSlotModal
          slot={bookingTarget}
          onClose={() => setBookingTarget(null)}
          onConfirm={(until) => bookMutation.mutate({ slotId: bookingTarget.id, until })}
          isPending={bookMutation.isPending}
        />
      )}
    </div>
  );
}

function SlotTile({ slot, onClick }: { slot: ParkingSlot; onClick: () => void }) {
  const { t } = useTranslation();
  const taken = slot.status === 'reserved_other';
  const mine = slot.status === 'reserved_self';
  const tone = mine
    ? 'bg-accent text-white border-accent shadow-sm'
    : taken
      ? 'bg-ink-100 dark:bg-ink-800 text-ink-400 border-ink-200 dark:border-ink-700 cursor-not-allowed'
      : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:scale-[1.02]';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={taken || mine}
      className={`flex flex-col items-start gap-0.5 p-3 rounded-xl border text-start transition-transform ${tone}`}
    >
      <span className="text-[11px] font-bold tabular-nums">{slot.label}</span>
      <span className="text-[10px] uppercase tracking-wider">
        {t(`homeParking.parking.status.${slot.status}`)}
      </span>
    </button>
  );
}

function BookSlotModal({
  slot,
  onClose,
  onConfirm,
  isPending,
}: {
  slot: ParkingSlot;
  onClose: () => void;
  onConfirm: (untilIso: string) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const [until, setUntil] = useState(toInputValue(localIsoNow(120)));

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 backdrop-blur-sm p-3">
      <div className="w-full max-w-md bg-white dark:bg-ink-900 rounded-2xl border border-ink-200 dark:border-ink-700 shadow-xl p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            {t(`homeParking.parking.zones.${slot.zone}`)}
          </span>
          <h2 className="text-lg font-extrabold text-ink-900 dark:text-white">
            {t('homeParking.parking.book.title', { label: slot.label })}
          </h2>
        </div>

        <FormField label={t('homeParking.parking.book.until')}>
          <input
            type="datetime-local"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-sm text-ink-900 dark:text-white"
          />
        </FormField>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 rounded-xl border border-ink-200 dark:border-ink-700 text-ink-700 dark:text-white text-sm font-semibold disabled:opacity-50"
          >
            {t('homeParking.back')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(fromInputValue(until))}
            disabled={isPending}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold disabled:opacity-40"
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {isPending
              ? t('homeParking.parking.book.booking')
              : t('homeParking.parking.book.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
