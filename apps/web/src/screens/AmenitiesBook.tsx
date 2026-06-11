// /amenities — live amenities catalog + booking flow.
//
// Three states drive the screen, swapped via AnimatePresence:
//   1. catalog  — list active amenities from GET /api/v1/amenities
//   2. form     — date / start / end / guests form for the selected
//                 amenity, hitting POST /api/v1/amenities/book
//   3. success  — sand-toned confirmation with motion cascade
//
// Capacity conflicts (the backend's 409) surface as a tailored inline
// error inside the form so the resident can immediately try a
// different slot without re-typing the date / amenity.

import { useMutation, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

// Hourly start times the amenity TimeSlotPicker offers. Each chip
// represents a 1-hour window; the form's `endTime` is computed as
// `startTime + 1h` so the canonical "asset-lock identity" matches
// what the backend stores in `time_slot`. Stretching to multi-hour
// bookings would need to fan the conflict check across the range.
const AMENITY_SLOT_STARTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
] as const;

function addHour(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const next = (h + 1) % 24;
  return `${String(next).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { InlineNotice, type InlineNoticeData } from '@/components/ui/InlineNotice';
import { bookAmenity, listAmenities, listBusyAmenitySlots, type Amenity } from '@/lib/residentApi';
import { residentQueryOptions } from '@/lib/useResidentQuery';

const AMENITIES_KEY = ['amenities', 'list'] as const;

// Motion variants matching ServiceBook — same cadence so the
// resident's eye reads the two flows as one product.
const LIST_PARENT_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
};

const LIST_ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] },
  },
};

const SUCCESS_PARENT_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const SUCCESS_ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] },
  },
};

interface BookingDraft {
  amenityId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  guestsCount: number;
}

interface BookedSummary {
  amenity: Amenity;
  draft: BookingDraft;
}

type View =
  | { stage: 'catalog' }
  | { stage: 'form'; amenity: Amenity }
  | { stage: 'success'; summary: BookedSummary };

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function AmenitiesBook() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [view, setView] = useState<View>({ stage: 'catalog' });

  const amenitiesQuery = useQuery<Amenity[]>({
    queryKey: AMENITIES_KEY,
    queryFn: listAmenities,
    staleTime: 60_000,
    ...residentQueryOptions<Amenity[]>(),
  });

  const headerTitle = useMemo(() => {
    if (view.stage === 'form') return t('amenities.form.title', { name: view.amenity.name });
    if (view.stage === 'success') return t('amenities.success.title');
    return t('amenities.title');
  }, [view, t]);

  const headerSubtitle =
    view.stage === 'catalog'
      ? t('amenities.subtitle')
      : view.stage === 'form'
        ? t('amenities.form.subtitle')
        : '';

  const onBack = () => {
    if (view.stage === 'form') return setView({ stage: 'catalog' });
    if (view.stage === 'success') return setView({ stage: 'catalog' });
    navigate('/services');
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50 dark:bg-ink-900">
      <header className="flex flex-row items-center gap-3 px-4 py-3 border-b border-sand-200/60 dark:border-ink-700 bg-white/80 dark:bg-ink-900/80 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('amenities.back')}
          className="w-10 h-10 -ms-2 rounded-2xl flex items-center justify-center bg-white border border-sand-200/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-base ease-smooth"
        >
          <ArrowLeft size={20} className="text-ink-700 dark:text-white rtl:rotate-180" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-ink-950 dark:text-white leading-tight truncate">
            {headerTitle}
          </h1>
          {headerSubtitle && (
            <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">{headerSubtitle}</p>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          {view.stage === 'catalog' && (
            <motion.div
              key="catalog"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="p-4"
            >
              <CatalogView
                query={amenitiesQuery}
                onSelect={(amenity) => setView({ stage: 'form', amenity })}
              />
            </motion.div>
          )}

          {view.stage === 'form' && (
            <motion.div
              key={`form-${view.amenity.id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className="p-4"
            >
              <BookingForm
                amenity={view.amenity}
                onSuccess={(draft) =>
                  setView({ stage: 'success', summary: { amenity: view.amenity, draft } })
                }
                onCancel={() => setView({ stage: 'catalog' })}
              />
            </motion.div>
          )}

          {view.stage === 'success' && (
            <motion.div
              key="success"
              variants={SUCCESS_PARENT_VARIANTS}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              className="px-6 pt-10 pb-8"
            >
              <SuccessView
                summary={view.summary}
                onBookAnother={() => setView({ stage: 'catalog' })}
                onBackToServices={() => navigate('/services')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Catalog ──────────────────────────────────────────────────────────────

function CatalogView({
  query,
  onSelect,
}: {
  query: ReturnType<typeof useQuery<Amenity[]>>;
  onSelect: (amenity: Amenity) => void;
}) {
  const { t } = useTranslation();

  if (query.status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-ink-500">
        <Loader2 size={20} className="animate-spin mb-2" />
        <p className="text-sm">{t('amenities.list.loading')}</p>
      </div>
    );
  }

  if (query.status === 'error') {
    return (
      <InlineNotice
        notice={{
          tone: 'error',
          message: t('amenities.list.errorTitle'),
          detail: query.error?.message,
        }}
      />
    );
  }

  if (query.data.length === 0) {
    return (
      <div className="text-center py-16 text-ink-500 text-sm">{t('amenities.list.empty')}</div>
    );
  }

  return (
    <motion.div
      variants={LIST_PARENT_VARIANTS}
      initial="hidden"
      animate="show"
      className="space-y-3"
    >
      {query.data.map((amenity) => (
        <motion.button
          key={amenity.id}
          type="button"
          variants={LIST_ITEM_VARIANTS}
          onClick={() => onSelect(amenity)}
          className="w-full text-start rounded-3xl bg-white dark:bg-ink-700 border border-sand-200/60 dark:border-ink-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-base ease-smooth p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-950"
        >
          <div className="flex flex-row items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-body-md font-bold text-ink-950 dark:text-white truncate">
                {amenity.name}
              </p>
              {amenity.description && (
                <p className="text-[12px] text-ink-500 dark:text-ink-100 leading-snug mt-0.5 line-clamp-2">
                  {amenity.description}
                </p>
              )}
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sand-100 text-ink-700 text-[11px] font-semibold">
                <Users size={11} />
                {t('amenities.list.capacity', { count: amenity.capacity })}
              </div>
            </div>
            <ChevronRight size={18} className="text-ink-400 flex-shrink-0 mt-0.5 rtl:rotate-180" />
          </div>
        </motion.button>
      ))}
    </motion.div>
  );
}

// ─── Booking form ────────────────────────────────────────────────────────

function BookingForm({
  amenity,
  onSuccess,
  onCancel,
}: {
  amenity: Amenity;
  onSuccess: (draft: BookingDraft) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [bookingDate, setBookingDate] = useState(todayIso());
  const [startTime, setStartTime] = useState('10:00');
  const [guestsCount, setGuestsCount] = useState(1);
  const [notice, setNotice] = useState<InlineNoticeData | null>(null);

  // Derived end time — strictly +1h from the picked slot start. Keeps
  // the asset-lock identity (`time_slot`) one-to-one with `startTime`.
  const endTime = useMemo(() => addHour(startTime), [startTime]);

  // Live busy-slots query — confirmed `time_slot` values already
  // locked for (amenity, date). Drives the chip-grid grey-out.
  const busySlotsQuery = useQuery<string[]>({
    queryKey: ['amenities', 'busy-slots', amenity.id, bookingDate] as const,
    queryFn: () => listBusyAmenitySlots(amenity.id, bookingDate),
    enabled: !!amenity.id && !!bookingDate,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const busySet = useMemo(() => new Set(busySlotsQuery.data ?? []), [busySlotsQuery.data]);

  // If the picked slot just became busy (an admin confirmed someone
  // else's booking 30s ago), bump the picker to the next free slot so
  // the user can't submit into a guaranteed 409.
  useEffect(() => {
    if (!busySet.has(startTime)) return;
    const nextFree = AMENITY_SLOT_STARTS.find((s) => !busySet.has(s));
    if (nextFree) setStartTime(nextFree);
  }, [busySet, startTime]);

  const mutation = useMutation({
    mutationFn: bookAmenity,
    onSuccess: () => {
      onSuccess({ amenityId: amenity.id, bookingDate, startTime, endTime, guestsCount });
    },
    onError: (err: Error) => {
      // The http client throws `Error("409 Conflict — ...")` for backend
      // 4xx/5xx; sniff the status off the message to give a tailored
      // capacity-collision message vs a generic "could not book".
      const msg = err.message ?? '';
      if (msg.startsWith('409')) {
        setNotice({
          tone: 'error',
          message: t('amenities.form.errors.capacity'),
          detail: msg,
        });
      } else {
        setNotice({
          tone: 'error',
          message: t('amenities.form.errors.generic', { message: msg }),
        });
      }
    },
  });

  const canSubmit = !mutation.isPending && guestsCount >= 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (endTime <= startTime) {
      setNotice({ tone: 'error', message: t('amenities.form.errors.endBeforeStart') });
      return;
    }
    mutation.mutate({
      amenityId: amenity.id,
      bookingDate,
      startTime,
      endTime,
      guestsCount,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {amenity.description && (
        <div className="rounded-2xl bg-white border border-sand-200/60 p-4 shadow-sm">
          <p className="text-sm text-ink-700 dark:text-ink-100 leading-snug">
            {amenity.description}
          </p>
        </div>
      )}

      <InlineNotice notice={notice} onDismiss={() => setNotice(null)} />

      <div className="rounded-3xl bg-white border border-sand-200/60 p-4 shadow-sm space-y-4">
        <Field label={t('amenities.form.date')}>
          <input
            type="date"
            value={bookingDate}
            min={todayIso()}
            onChange={(e) => setBookingDate(e.target.value)}
            required
            aria-label={t('amenities.form.date')}
            className="w-full px-3 py-2.5 rounded-xl border border-sand-200 bg-white text-sm text-ink-950 tabular-nums focus:outline-none focus:border-ink-400"
          />
        </Field>

        <Field
          label={t('amenities.form.timeSlot')}
          help={t('amenities.form.timeSlotHelp', { endTime })}
        >
          <div className="flex flex-row flex-wrap gap-2">
            {AMENITY_SLOT_STARTS.map((slot) => {
              const isBusy = busySet.has(slot);
              const active = slot === startTime;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => !isBusy && setStartTime(slot)}
                  disabled={isBusy}
                  aria-pressed={active ? 'true' : 'false'}
                  aria-disabled={isBusy ? 'true' : 'false'}
                  title={isBusy ? t('amenities.form.slotBookedTitle') : undefined}
                  className={[
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors tabular-nums',
                    isBusy
                      ? 'bg-ink-100 text-ink-400 border-ink-100 line-through cursor-not-allowed'
                      : active
                        ? 'bg-ink-950 dark:bg-white text-white dark:text-ink-950 border-ink-950 dark:border-white'
                        : 'bg-white dark:bg-ink-700 text-ink-700 dark:text-white border-sand-200 dark:border-ink-700 hover:border-ink-400',
                  ].join(' ')}
                >
                  <span dir="ltr">{slot}</span>
                  {isBusy && (
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                      {t('amenities.form.slotBookedBadge')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Field>

        <Field
          label={t('amenities.form.guests')}
          help={t('amenities.form.guestsHelp', { capacity: amenity.capacity })}
        >
          <input
            type="number"
            min={1}
            max={amenity.capacity}
            value={guestsCount}
            onChange={(e) => setGuestsCount(Math.max(1, Number(e.target.value) || 1))}
            required
            aria-label={t('amenities.form.guests')}
            className="w-full px-3 py-2.5 rounded-xl border border-sand-200 bg-white text-sm text-ink-950 tabular-nums focus:outline-none focus:border-ink-400"
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-ink-950 dark:bg-white text-white dark:text-ink-950 py-3.5 text-sm font-bold shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-base ease-smooth disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {t('amenities.form.submitting')}
            </>
          ) : (
            t('amenities.form.submit')
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={mutation.isPending}
          className="w-full rounded-2xl bg-white border border-sand-200/60 text-ink-700 py-3 text-sm font-semibold hover:shadow-md active:scale-[0.99] transition-all duration-base ease-smooth disabled:opacity-50"
        >
          {t('amenities.form.back')}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{label}</span>
      {children}
      {help && <span className="text-[11px] text-ink-400">{help}</span>}
    </label>
  );
}

// ─── Success ──────────────────────────────────────────────────────────────

function SuccessView({
  summary,
  onBookAnother,
  onBackToServices,
}: {
  summary: BookedSummary;
  onBookAnother: () => void;
  onBackToServices: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { amenity, draft } = summary;
  const dateLabel = useMemo(() => {
    return new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${draft.bookingDate}T00:00:00Z`));
  }, [draft.bookingDate, i18n.language]);

  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        variants={SUCCESS_ITEM_VARIANTS}
        initial={{ opacity: 0, y: 12, scale: 0.6 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
        className="w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-200 shadow-md flex items-center justify-center mb-5 text-emerald-600"
      >
        <CheckCircle2 size={40} />
      </motion.div>
      <motion.h2
        variants={SUCCESS_ITEM_VARIANTS}
        className="text-2xl font-extrabold text-ink-950 dark:text-white mb-2"
      >
        {t('amenities.success.title')}
      </motion.h2>
      <motion.p
        variants={SUCCESS_ITEM_VARIANTS}
        className="text-sm text-ink-500 dark:text-ink-100 max-w-sm leading-snug"
      >
        {t('amenities.success.body', {
          name: amenity.name,
          date: dateLabel,
          start: draft.startTime,
          end: draft.endTime,
        })}
      </motion.p>

      <motion.div variants={SUCCESS_ITEM_VARIANTS} className="w-full max-w-sm space-y-2.5 mt-8">
        <button
          type="button"
          onClick={onBookAnother}
          className="w-full bg-ink-950 dark:bg-white text-white dark:text-ink-950 rounded-2xl py-3.5 text-sm font-bold shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-base ease-smooth"
        >
          {t('amenities.success.bookAnother')}
        </button>
        <button
          type="button"
          onClick={onBackToServices}
          className="w-full bg-white border border-sand-200/60 text-ink-700 rounded-2xl py-3 text-sm font-semibold hover:shadow-md active:scale-[0.99] transition-all duration-base ease-smooth"
        >
          {t('amenities.success.back')}
        </button>
      </motion.div>
    </div>
  );
}

// Silence unused-import lint for icons kept for future surfaces.
const _unused = { AlertCircle, Clock };
void _unused;
