import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { Check, CheckCircle2, Home as HomeIcon, Loader2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, type FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Calendar } from '@/components/booking/Calendar';
import { InlineNotice, type InlineNoticeData } from '@/components/ui/InlineNotice';
import { formatFullDate, fromDateIso, toDateIso } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { SERVICE_TILES } from '@/lib/mock/services';
import {
  getProviderById,
  offeringLabelKey,
  type ProviderOffering,
  type ServiceProvider,
} from '@/lib/mock/serviceProviders';
import {
  AuthRequiredError,
  createMyServiceBooking,
  createMyTicket,
  getMaintenanceAvailability,
  listAvailableMaintenanceSlots,
  MAINTENANCE_TIME_SLOTS,
  type MaintenanceAvailableSlotsResponse,
  type MaintenanceAvailabilityResponse,
  type TicketCategory,
} from '@/lib/residentApi';
import {
  serviceBookingFormSchema,
  type ServiceBookingFormInput,
} from '@/lib/schemas/serviceRequest';
import { OtelBookingButton } from '@/components/booking/OtelBookingButton';
import { useCurrentProperty } from '@/stores/propertyStore';
import { useShowServiceDurations } from '@/stores/featureTogglesStore';

const FIXED_SLOTS = ['09:00', '11:00', '13:00', '15:00', '17:00'];

// Map an offering key from the Home Services tile onto the maintenance
// ticket category enum the backend's availability counter uses. Single
// source so the category passed to `getMaintenanceAvailability` and
// the one persisted on the ticket can never drift.
function offeringToCategory(offeringKey: string): TicketCategory {
  if (offeringKey === 'pest') return 'pest';
  if (offeringKey === 'plumbing') return 'plumbing';
  if (offeringKey === 'electrical') return 'electrical';
  return 'other';
}

export function ServiceBook() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { tileId = '' } = useParams<{ tileId: string }>();
  const [params] = useSearchParams();
  const providerId = params.get('providerId') ?? '';
  const offeringKey = params.get('offering') ?? '';

  const tile = SERVICE_TILES.find((tl) => tl.id === tileId);
  const provider = getProviderById(providerId);
  const offering = provider?.offerings.find((o) => o.key === offeringKey);
  const property = useCurrentProperty();
  const qc = useQueryClient();

  const [submitted, setSubmitted] = useState(false);

  // Inline notice replaces the legacy window.alert() popups. Stored as
  // null when no message is active. Auto-dismisses after 6 s so a stale
  // banner doesn't linger if the user navigates away mentally; manual
  // dismiss button stays available for impatient readers.
  const [notice, setNotice] = useState<InlineNoticeData | null>(null);
  useEffect(() => {
    if (!notice) return undefined;
    const id = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(id);
  }, [notice]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    watch,
    control,
    reset,
    setValue,
  } = useForm<ServiceBookingFormInput>({
    resolver: zodResolver(serviceBookingFormSchema),
    mode: 'onBlur',
  });

  if (!tile || !provider || !offering || !property) {
    return <Navigate to={`/services/${tileId || ''}`} replace />;
  }

  const dateIso = watch('dateIso');
  const timeSlot = watch('timeSlot');
  const selectedDate = dateIso ? fromDateIso(dateIso) : null;

  // Architectural option A: Home Services (Pest · Plumbing · Repair)
  // semantically maps onto the existing maintenance-ticket pipeline so
  // it reuses the admin dispatch board + technician roster. Every other
  // bookable tile lands in the dedicated `/me/service-bookings`
  // endpoint that broadcasts to the admin service-bookings dashboard.
  const isMaintenanceTile = tile.id === 'daily-home';
  const maintenanceCategory = useMemo(
    () => (offering ? offeringToCategory(offering.key) : null),
    [offering],
  );

  // Live availability for the maintenance slot grid — backed by the
  // new dynamic capacity engine. `capacity` for each slot = active
  // technicians in the category; `available` = capacity - confirmed
  // bookings. So picking "plumbing" with 3 seeded plumbers gives a
  // 3-per-slot ceiling automatically; seeding a 4th instantly raises
  // it without a code change.
  //
  // The legacy `/maintenance/availability` endpoint (`MaintenanceAvailabilityResponse`
  // type) is still wired in residentApi for back-compat with anything
  // outside ServiceBook that hasn't migrated; ServiceBook reads only
  // the new shape and adapts it to the legacy grid contract.
  const dynamicSlotsQuery = useQuery<MaintenanceAvailableSlotsResponse>({
    queryKey: ['maintenance', 'available-slots', maintenanceCategory, dateIso],
    queryFn: () => {
      if (!isMaintenanceTile || !maintenanceCategory || !dateIso) {
        throw new Error('available-slots query fired without prerequisites');
      }
      return listAvailableMaintenanceSlots(maintenanceCategory, dateIso);
    },
    enabled: Boolean(isMaintenanceTile && maintenanceCategory && dateIso),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Adapt the new HH:MM-start payload into the legacy "HH:MM-HH:MM"
  // slot vocabulary the existing MaintenanceSlotGrid consumes. Single
  // shape downstream → zero UI churn during the engine swap.
  const availabilityData = useMemo<MaintenanceAvailabilityResponse | undefined>(() => {
    const d = dynamicSlotsQuery.data;
    if (!d) return undefined;
    return {
      category: d.category,
      dateIso: d.dateIso,
      capacityPerSlot: d.technicianCount,
      slots: MAINTENANCE_TIME_SLOTS.map((rangeSlot) => {
        const start = rangeSlot.slice(0, 5);
        const dyn = d.slots.find((s) => s.slot === start);
        if (!dyn) {
          return { slot: rangeSlot, bookedCount: 0, capacity: 0, available: false };
        }
        return {
          slot: rangeSlot,
          bookedCount: dyn.confirmed,
          capacity: dyn.capacity,
          available: dyn.available > 0,
        };
      }),
    };
  }, [dynamicSlotsQuery.data]);

  // Auto-clear the picked slot if its capacity ran out mid-form (e.g.
  // an admin confirmed another resident's request for the same slot
  // 30s ago). Prevents the inevitable SlotFullError on submit.
  useEffect(() => {
    if (!availabilityData || !timeSlot) return;
    const meta = availabilityData.slots.find((s) => s.slot === timeSlot);
    if (meta && !meta.available) {
      setValue('timeSlot', '' as ServiceBookingFormInput['timeSlot']);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availabilityData]);

  // Read-only legacy hook so the unused-import lint stays quiet during
  // the transition period. Remove once nothing else imports it.
  void getMaintenanceAvailability;

  const onSubmit = async (data: ServiceBookingFormInput) => {
    try {
      if (isMaintenanceTile) {
        const category: TicketCategory = offeringToCategory(offering.key);
        const ticket = await createMyTicket({
          category,
          title: t(offeringLabelKey(tile.id, offering.key)),
          description:
            (data.notes ? `${data.notes}\n\n` : '') +
            `Scheduled: ${data.dateIso} ${data.timeSlot} · provider ${provider.name}`,
          urgency: 'routine',
          // 24/7 slot scheduling fields. Backend capacity-checks these
          // inside the same transaction and 409s if the slot just filled
          // up between the availability fetch and the submit — see the
          // catch path below.
          scheduledDateIso: data.dateIso,
          scheduledTimeSlot: data.timeSlot,
        });
        // Diagnostic log: prove the server actually wrote the row by
        // surfacing the id it returned. If you see this line in the
        // browser console + see the matching row in admin, the write
        // is genuinely live. No localStorage mirror — the server is
        // the only source of truth.
        console.info('[ServiceBook] maintenance ticket created server-side:', {
          id: ticket.id,
          openedAt: ticket.openedAt,
          residentName: ticket.residentName,
          category: ticket.category,
        });
        // refetchQueries (not invalidateQueries) so the polled list
        // refreshes immediately EVEN IF it was previously sitting in an
        // error state from a transient Clerk auth blip. invalidate alone
        // only marks the cache stale; refetch forces a fresh GET right
        // now using the (just-validated) auth channel that succeeded
        // for the POST we're reacting to.
        void qc.refetchQueries({ queryKey: ['me', 'requests'] });
      } else {
        const booking = await createMyServiceBooking({
          tileId: tile.id,
          providerId: provider.id,
          offeringKey: offering.key,
          dateIso: data.dateIso,
          timeSlot: data.timeSlot,
          notes: data.notes,
        });
        console.info('[ServiceBook] service booking created server-side:', {
          id: booking.id,
          createdAt: booking.createdAt,
          tileId: booking.tileId,
          providerId: booking.providerId,
          residentName: booking.residentName,
        });
        void qc.refetchQueries({ queryKey: ['me', 'service-bookings'] });
      }
      reset();
      setSubmitted(true);
    } catch (err) {
      // AuthRequiredError = Clerk session expired / lost. Show a
      // distinct message + redirect to sign-in so the resident isn't
      // stuck blaming their connection.
      console.error('[ServiceBook] submission failed:', err);
      if (err instanceof AuthRequiredError) {
        setNotice({ tone: 'error', message: t('services.book.errors.authExpired') });
        navigate('/sign-in?redirect=/services');
        return;
      }
      // The inline notice carries the localized banner + the raw error
      // message in its `detail` line so the resident (and we, debugging
      // via screenshots) can tell whether the failure is a CORS reject,
      // a 422 validation error, a 5xx, a 409 slot-full, or something
      // else — without an opaque "check your connection" catch-all.
      const detail = err instanceof Error ? err.message : String(err);
      setNotice({ tone: 'error', message: t('services.book.errors.submit'), detail });
    }
  };

  if (submitted) {
    return (
      <SuccessState
        provider={provider}
        onViewRequests={() => navigate('/services/requests')}
        onBackToServices={() => navigate('/services')}
      />
    );
  }

  return (
    // Light sand backdrop — calmer #F5F5F5-equivalent (sand-50 / #FBF7F0)
    // tied into the brand identity tokens, so the form sits on a soft
    // neutral instead of the prior amber/rose wash. Dark-mode keeps the
    // existing ink palette.
    <div className="flex-1 flex flex-col bg-sand-50 dark:bg-ink-900">
      <Header onClose={() => navigate(`/services/${tile.id}/providers/${provider.id}`)} />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-6"
      >
        {/* Submission feedback — replaces window.alert() popups with an
            inline banner that animates in/out via AnimatePresence. The
            6 s auto-dismiss happens in the useEffect above. */}
        <InlineNotice notice={notice} onDismiss={() => setNotice(null)} />

        {/* Read-only summary widget — confirms what's being booked */}
        <SummaryWidget
          tile={tile}
          provider={provider}
          offering={offering}
          propertyName={`${property.unitName} · ${property.compoundName}`}
        />

        {/* When */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
            {t('services.book.sections.when')}
          </h3>
          <Controller
            name="dateIso"
            control={control}
            render={({ field }) => (
              <Calendar
                value={field.value ? fromDateIso(field.value) : null}
                onChange={(d) => field.onChange(toDateIso(d))}
              />
            )}
          />
          {errors.dateIso?.message && (
            <p className="text-[11px] text-red-500" role="alert">
              {t(errors.dateIso.message)}
            </p>
          )}

          <p className="text-[11px] font-semibold text-ink-700 dark:text-ink-100 mt-2">
            {t(
              isMaintenanceTile
                ? 'services.book.maintenanceSlotsTitle'
                : 'services.book.slotsTitle',
            )}
          </p>
          <Controller
            name="timeSlot"
            control={control}
            render={({ field }) =>
              isMaintenanceTile ? (
                <MaintenanceSlotGrid
                  selected={field.value}
                  onSelect={(slot) => field.onChange(slot)}
                  availability={availabilityData}
                  isLoading={dynamicSlotsQuery.isPending}
                  isError={dynamicSlotsQuery.isError}
                  dateChosen={Boolean(dateIso)}
                />
              ) : (
                <div className="flex flex-row flex-wrap gap-2">
                  {FIXED_SLOTS.map((slot) => {
                    const active = slot === field.value;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => field.onChange(slot)}
                        aria-pressed={active}
                        className={[
                          'px-3 py-1.5 rounded-full text-xs font-semibold border tabular-nums transition-colors',
                          active
                            ? 'bg-brand-500 text-white border-brand-500'
                            : 'bg-white dark:bg-ink-700 text-ink-700 dark:text-white border-ink-100 dark:border-ink-700 hover:border-brand-400',
                        ].join(' ')}
                      >
                        <span dir="ltr">{slot}</span>
                      </button>
                    );
                  })}
                </div>
              )
            }
          />
          {errors.timeSlot?.message && (
            <p className="text-[11px] text-red-500" role="alert">
              {t(errors.timeSlot.message)}
            </p>
          )}
        </section>

        {/* Notes */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
            {t('services.book.sections.notes')}
          </h3>
          <label
            htmlFor="svc-notes"
            className="block text-xs font-semibold text-ink-700 dark:text-ink-100"
          >
            {t('services.book.fields.notes.label')}
          </label>
          <textarea
            id="svc-notes"
            rows={3}
            maxLength={500}
            placeholder={t('services.book.fields.notes.placeholder')}
            className="w-full rounded-2xl px-4 py-3 text-sm text-ink-900 dark:text-white bg-white/80 dark:bg-ink-700 backdrop-blur-sm border border-white/60 dark:border-ink-700 shadow-sm shadow-ink-900/5 outline-none focus:border-brand-500 focus:shadow-md focus:shadow-brand-500/15 transition-all duration-300 ease-smooth"
            {...register('notes')}
          />

          <ConsentRow control={control} errors={errors} />
        </section>

        <div className="pt-2 pb-6 space-y-2">
          {isDirty && (
            <p className="text-[11px] text-ink-500 dark:text-ink-100 text-center">
              {t('services.book.draftSaved')}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-br from-ink-900 to-ink-800 disabled:from-ink-400 disabled:to-ink-400 disabled:cursor-not-allowed rounded-2xl py-3.5 text-white font-semibold shadow-lg shadow-ink-900/20 hover:shadow-xl hover:shadow-ink-900/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 ease-smooth"
          >
            {/* Cross-fade between idle + submitting labels. AnimatePresence
                with mode="wait" so the outgoing label fully fades before
                the spinner slides in — no juddery overlap, no layout shift. */}
            <AnimatePresence mode="wait" initial={false}>
              {isSubmitting ? (
                <motion.span
                  key="submitting"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="inline-flex items-center justify-center gap-2"
                >
                  <Loader2 size={16} className="animate-spin" />
                  {t('services.book.submitting')}
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="inline-block"
                >
                  {t('services.book.submit')}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </form>

      {/* For screen-reader / debugging: pre-render the selected-day label below the form */}
      {selectedDate && (
        <span className="sr-only">{formatFullDate(selectedDate, i18n.language)}</span>
      )}
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function Header({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-row items-center gap-3 px-4 py-3 border-b border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-900">
      <button
        type="button"
        onClick={onClose}
        aria-label={t('services.book.close')}
        className="w-10 h-10 -ms-2 rounded-2xl flex items-center justify-center bg-white/70 dark:bg-ink-700/70 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-sm shadow-ink-900/5 hover:bg-white hover:scale-105 active:scale-95 transition-all duration-300 ease-smooth"
      >
        <X size={20} className="text-ink-700 dark:text-white" />
      </button>
      <h2 className="flex-1 text-base font-bold text-ink-900 dark:text-white leading-tight truncate">
        {t('services.book.title')}
      </h2>
      <OtelBookingButton compact />
    </div>
  );
}

// Motion variants for the slot grid: container staggers child entry,
// each child fades-and-slides up. Tap variant scales the selected slot
// for a subtle press feedback. Defined at module scope so reference
// identity is stable across renders.
const SLOT_GRID_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.04 },
  },
};

const SLOT_ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] },
  },
};

// CSS background for the "Full" slot — soft diagonal stripes layered over
// the sand surface. Tailwind's arbitrary-value syntax keeps the pattern
// declarative without pulling in a custom plugin. The sand-tinted lines
// stay subtle so the badge does the heavy lifting visually.
const FULL_STRIPES =
  'bg-[repeating-linear-gradient(135deg,_theme(colors.sand.200)_0px,_theme(colors.sand.200)_6px,_theme(colors.sand.100)_6px,_theme(colors.sand.100)_12px)]';

function MaintenanceSlotGrid({
  selected,
  onSelect,
  availability,
  isLoading,
  isError,
  dateChosen,
}: {
  selected: string | undefined;
  onSelect: (slot: string) => void;
  availability: MaintenanceAvailabilityResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  dateChosen: boolean;
}) {
  const { t } = useTranslation();

  // Until the resident picks a date there's nothing to show capacity
  // against — render an instructional placeholder instead of an empty
  // grid that pretends to be live. Animated with a clean fade+slide so
  // swapping between placeholder ↔ grid feels intentional.
  return (
    <AnimatePresence mode="wait" initial={false}>
      {!dateChosen ? (
        <motion.div
          key="pick-date"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
          className="rounded-2xl border border-dashed border-sand-300 dark:border-ink-700 bg-white/40 dark:bg-ink-900/40 px-4 py-6 text-center text-xs text-ink-500 dark:text-ink-100"
        >
          {t('services.book.maintenanceSlots.pickDateFirst')}
        </motion.div>
      ) : isError ? (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          className="rounded-2xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-xs text-red-700 dark:text-red-200"
        >
          {t('services.book.maintenanceSlots.error')}
        </motion.div>
      ) : (
        <motion.div
          key="grid"
          variants={SLOT_GRID_VARIANTS}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
        >
          {MAINTENANCE_TIME_SLOTS.map((slot) => {
            const meta = availability?.slots.find((s) => s.slot === slot);
            const active = slot === selected;
            const available = meta?.available ?? false;
            const bookedCount = meta?.bookedCount ?? 0;
            const capacity = meta?.capacity ?? availability?.capacityPerSlot ?? 3;
            const disabled = isLoading || !meta || !available;
            const isFull = Boolean(meta) && !isLoading && !available;

            return (
              <motion.button
                key={slot}
                type="button"
                variants={SLOT_ITEM_VARIANTS}
                whileTap={disabled ? undefined : { scale: 0.97 }}
                whileHover={disabled ? undefined : { y: -2 }}
                onClick={() => !disabled && onSelect(slot)}
                disabled={disabled}
                aria-pressed={active}
                aria-label={t('services.book.maintenanceSlots.slotAria', {
                  slot,
                  booked: bookedCount,
                  capacity,
                })}
                className={[
                  // Aspect-ratio sized so the grid breathes evenly at
                  // every viewport — squares on mobile (2-col) keep
                  // taps comfortable; the 4-col desktop layout flattens
                  // them slightly via `sm:aspect-[5/4]`.
                  'relative flex flex-col items-center justify-center gap-1 rounded-2xl border-2 tabular-nums overflow-hidden',
                  'aspect-square sm:aspect-[5/4]',
                  'transition-colors duration-base ease-smooth',
                  active && !disabled
                    ? // Selected: brand-cyan ring + soft shadow. Scale is
                      // handled by the parent motion (whileTap), so we
                      // skip a transform here to avoid jank.
                      'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/30'
                    : isFull
                      ? // Full: sand-tinted stripe pattern + heavy
                        // muting on text. Cursor-not-allowed reinforces.
                        `${FULL_STRIPES} text-ink-400 border-sand-200 cursor-not-allowed dark:bg-ink-900/40 dark:border-ink-700 dark:text-ink-700 opacity-80`
                      : disabled
                        ? // Loading placeholder — same muted style as
                          // Full but no stripes (keeps a clean
                          // shimmer-able surface).
                          'bg-sand-100/60 text-ink-400 border-sand-200 cursor-wait dark:bg-ink-900/40 dark:border-ink-700 dark:text-ink-700'
                        : // Available + idle.
                          'bg-white dark:bg-ink-700 text-ink-900 dark:text-white border-sand-200 dark:border-ink-700 hover:border-brand-400 hover:shadow-md',
                ].join(' ')}
              >
                {/* "Full" badge in the corner — only renders when
                    that's actually the slot's state. Sits on top of
                    the diagonal stripes so it reads cleanly. */}
                {isFull && (
                  <span className="absolute top-1.5 end-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-status-danger/90 text-white text-[9px] font-bold uppercase tracking-wider shadow-sm">
                    {t('services.book.maintenanceSlots.full')}
                  </span>
                )}

                <span dir="ltr" className="text-sm font-bold leading-tight">
                  {slot}
                </span>

                <span
                  className={[
                    'text-[10px] uppercase tracking-wider font-semibold leading-tight',
                    active && !disabled
                      ? 'text-white/85'
                      : isFull
                        ? 'text-ink-400'
                        : disabled
                          ? 'text-ink-400'
                          : 'text-ink-500 dark:text-ink-100',
                  ].join(' ')}
                >
                  {isLoading
                    ? t('services.book.maintenanceSlots.loading')
                    : !meta
                      ? '—'
                      : isFull
                        ? `${capacity}/${capacity}`
                        : t('services.book.maintenanceSlots.openCount', {
                            booked: bookedCount,
                            capacity,
                          })}
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SummaryWidget({
  tile,
  provider,
  offering,
  propertyName,
}: {
  tile: (typeof SERVICE_TILES)[number];
  provider: ServiceProvider;
  offering: ProviderOffering;
  propertyName: string;
}) {
  const { t, i18n } = useTranslation();
  const showServiceDurations = useShowServiceDurations();
  return (
    <div className="rounded-3xl border border-white/60 dark:border-brand-700 bg-gradient-to-br from-brand-50/80 via-white/60 to-amber-50/40 dark:bg-brand-700/30 backdrop-blur-md p-4 space-y-2 shadow-lg shadow-brand-500/10">
      <SummaryRow
        label={t('services.book.summary.provider')}
        value={`${tile.name} · ${provider.name}`}
      />
      <SummaryRow
        label={t('services.book.summary.offering')}
        value={t(offeringLabelKey(tile.id, offering.key))}
      />
      {/* Grid collapses to a single full-width Price row when the
          Service Durations toggle is off — keeps the summary visually
          balanced regardless of which fields are surfaced. */}
      <div className={`grid ${showServiceDurations ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
        {showServiceDurations && (
          <SummaryRow
            label={t('services.book.summary.duration')}
            value={t('services.providers.offeringDuration', { min: offering.durationMin })}
            inline
          />
        )}
        <SummaryRow
          label={t('services.book.summary.price')}
          value={`EGP ${formatNumber(offering.priceEgp, i18n.language)}`}
          inline
          emphasis
        />
      </div>
      <div className="flex flex-row items-center gap-1.5 text-[11px] text-ink-500 dark:text-ink-100 pt-1 border-t border-brand-100 dark:border-brand-700">
        <HomeIcon size={12} />
        <span>
          {t('services.book.summary.property')}:{' '}
          <span className="font-semibold">{propertyName}</span>
        </span>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  inline,
  emphasis,
}: {
  label: string;
  value: string;
  inline?: boolean;
  emphasis?: boolean;
}) {
  if (inline) {
    return (
      <div className="bg-white/70 dark:bg-ink-900/40 backdrop-blur-sm border border-white/50 rounded-2xl px-2.5 py-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500">{label}</p>
        <p
          className={[
            'text-sm font-bold tabular-nums truncate',
            emphasis ? 'text-brand-700 dark:text-brand-400' : 'text-ink-900 dark:text-white',
          ].join(' ')}
        >
          {value}
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-row justify-between gap-3 text-xs">
      <span className="text-ink-500 dark:text-ink-100 font-semibold">{label}</span>
      <span className="text-ink-900 dark:text-white text-end font-semibold truncate">{value}</span>
    </div>
  );
}

function ConsentRow({
  control,
  errors,
}: {
  control: ReturnType<typeof useForm<ServiceBookingFormInput>>['control'];
  errors: FieldErrors<ServiceBookingFormInput>;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <Controller
        name="consent"
        control={control}
        render={({ field }) => {
          const checked = field.value === true;
          return (
            <label className="flex flex-row items-start gap-3 cursor-pointer">
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => field.onChange(!checked)}
                onBlur={field.onBlur}
                className={[
                  'mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors',
                  checked
                    ? 'bg-brand-500 border-brand-500'
                    : 'bg-white dark:bg-ink-700 border-ink-100 dark:border-ink-700',
                ].join(' ')}
              >
                {checked && <Check size={14} color="#fff" />}
              </button>
              <span className="text-xs text-ink-700 dark:text-ink-100 leading-snug">
                {t('services.book.fields.consent.label')}
              </span>
            </label>
          );
        }}
      />
      {errors.consent?.message && (
        <p className="mt-1 text-[11px] text-red-500" role="alert">
          {t(errors.consent.message)}
        </p>
      )}
    </div>
  );
}

// Motion variants for the success screen — a parent fade-in that
// staggers the checkmark, title, body, and CTAs in a clean cascade so
// the resident's relief response feels paced rather than jumpy.
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

function SuccessState({
  provider,
  onViewRequests,
  onBackToServices,
}: {
  provider: ServiceProvider;
  onViewRequests: () => void;
  onBackToServices: () => void;
}) {
  const { t } = useTranslation();
  return (
    <motion.div
      variants={SUCCESS_PARENT_VARIANTS}
      initial="hidden"
      animate="show"
      className="flex-1 flex flex-col bg-sand-50 dark:bg-ink-900 px-6 pt-12 pb-8"
    >
      <div className="flex-1 flex flex-col items-center text-center">
        <motion.div
          variants={SUCCESS_ITEM_VARIANTS}
          // A little extra spring on the checkmark so it lands with
          // satisfaction. The card itself eases linearly into place.
          initial={{ opacity: 0, y: 12, scale: 0.6 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
          className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-700/30 backdrop-blur-md border border-white/60 shadow-xl shadow-emerald-500/20 ring-1 ring-white/40 flex items-center justify-center mb-5 text-emerald-600"
        >
          <CheckCircle2 size={40} />
        </motion.div>
        <motion.h2
          variants={SUCCESS_ITEM_VARIANTS}
          className="text-2xl font-extrabold text-ink-900 dark:text-white mb-2"
        >
          {t('services.book.success.title')}
        </motion.h2>
        <motion.p
          variants={SUCCESS_ITEM_VARIANTS}
          className="text-sm text-ink-500 dark:text-ink-100 max-w-sm"
        >
          {t('services.book.success.body', {
            provider: provider.name,
            min: provider.responseTimeMin,
          })}
        </motion.p>
      </div>
      <motion.div variants={SUCCESS_ITEM_VARIANTS} className="space-y-2.5">
        <button
          type="button"
          onClick={onViewRequests}
          className="w-full bg-gradient-to-br from-ink-900 to-ink-800 rounded-2xl py-3.5 text-white font-semibold shadow-lg shadow-ink-900/20 hover:shadow-xl hover:shadow-ink-900/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 ease-smooth"
        >
          {t('services.book.success.viewRequests')}
        </button>
        <button
          type="button"
          onClick={onBackToServices}
          className="w-full bg-white/70 dark:bg-ink-700/70 backdrop-blur-md border border-white/50 dark:border-white/10 text-ink-700 dark:text-white rounded-2xl py-3 text-sm font-semibold shadow-md shadow-ink-900/5 hover:bg-white hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 ease-smooth"
        >
          {t('services.book.success.backToServices')}
        </button>
      </motion.div>
    </motion.div>
  );
}
