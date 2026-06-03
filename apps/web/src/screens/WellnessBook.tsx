import { zodResolver } from '@hookform/resolvers/zod';
import { Check, CheckCircle2, Home as HomeIcon, X } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, type FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Calendar } from '@/components/booking/Calendar';
import { fromDateIso, toDateIso } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import {
  getFacility,
  getSessionById,
  type WellnessFacility,
  type WellnessSession,
} from '@/lib/mock/wellness';
import { AuthRequiredError, createMyServiceBooking } from '@/lib/residentApi';
import {
  serviceBookingFormSchema,
  type ServiceBookingFormInput,
} from '@/lib/schemas/serviceRequest';
import { OtelBookingButton } from '@/components/booking/OtelBookingButton';
import { useCurrentProperty } from '@/stores/propertyStore';
import { useServiceRequestsStore } from '@/stores/serviceRequestsStore';
import { useShowServiceDurations } from '@/stores/featureTogglesStore';

const FIXED_SLOTS = ['09:00', '11:00', '13:00', '15:00', '17:00'];

export function WellnessBook() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { facilityId = '' } = useParams<{ facilityId: string }>();
  const [params] = useSearchParams();
  const sessionId = params.get('session') ?? '';

  const facility = getFacility(facilityId);
  const session = getSessionById(sessionId);
  const property = useCurrentProperty();
  const addRequest = useServiceRequestsStore((s) => s.addRequest);

  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    control,
    reset,
  } = useForm<ServiceBookingFormInput>({
    resolver: zodResolver(serviceBookingFormSchema),
    mode: 'onBlur',
  });

  if (!facility || !session || !property) {
    return <Navigate to="/services/wellness" replace />;
  }

  const onSubmit = async (data: ServiceBookingFormInput) => {
    try {
      const booking = await createMyServiceBooking({
        tileId: facility.bookingTileId,
        providerId: `wellness-${facility.id}`,
        offeringKey: session.id,
        dateIso: data.dateIso,
        timeSlot: data.timeSlot,
        notes: data.notes,
      });
      // Optimistic mirror so the resident's local requests pane lights
      // up immediately. The WS stream is the authoritative source.
      addRequest({
        ...data,
        id: booking.id,
        tileId: facility.bookingTileId,
        providerId: `wellness-${facility.id}`,
        offeringKey: session.id,
        propertyId: property.id,
        status: 'pending',
        createdAt: booking.createdAt,
      });
      reset();
      setSubmitted(true);
    } catch (err) {
      console.error('[WellnessBook] submission failed:', err);
      if (err instanceof AuthRequiredError) {
        window.alert(t('services.book.errors.authExpired'));
        navigate('/sign-in?redirect=/services/wellness');
        return;
      }
      window.alert(t('services.book.errors.submit'));
    }
  };

  if (submitted) {
    return (
      <SuccessState
        facility={facility}
        session={session}
        onViewRequests={() => navigate('/services/requests')}
        onBackToServices={() => navigate('/services/wellness')}
      />
    );
  }

  return (
    // Warm cream wash — same vocabulary as ServiceBook so the booking
    // surfaces all read as one product, not three separate flows.
    <div className="flex-1 flex flex-col bg-gradient-to-b from-amber-50/60 via-rose-50/40 to-white dark:from-ink-900 dark:via-ink-900 dark:to-ink-900">
      <Header onClose={() => navigate(`/services/wellness/${facility.id}`)} />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-6"
      >
        <SummaryWidget
          facility={facility}
          session={session}
          propertyName={`${property.unitName} · ${property.compoundName}`}
        />

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
            {t('services.book.slotsTitle')}
          </p>
          <Controller
            name="timeSlot"
            control={control}
            render={({ field }) => (
              <div className="flex flex-row flex-wrap gap-2">
                {FIXED_SLOTS.map((slot) => {
                  const active = slot === field.value;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => field.onChange(slot)}
                      aria-pressed={active ? 'true' : 'false'}
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
            )}
          />
          {errors.timeSlot?.message && (
            <p className="text-[11px] text-red-500" role="alert">
              {t(errors.timeSlot.message)}
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
            {t('services.book.sections.notes')}
          </h3>
          <label
            htmlFor="wellness-notes"
            className="block text-xs font-semibold text-ink-700 dark:text-ink-100"
          >
            {t('services.book.fields.notes.label')}
          </label>
          <textarea
            id="wellness-notes"
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
            className="w-full bg-gradient-to-br from-ink-900 to-ink-800 disabled:from-ink-400 disabled:to-ink-400 rounded-2xl py-3.5 text-white font-semibold shadow-lg shadow-ink-900/20 hover:shadow-xl hover:shadow-ink-900/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 ease-smooth"
          >
            {isSubmitting ? t('services.book.submitting') : t('services.book.submit')}
          </button>
        </div>
      </form>
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

function SummaryWidget({
  facility,
  session,
  propertyName,
}: {
  facility: WellnessFacility;
  session: WellnessSession;
  propertyName: string;
}) {
  const { t, i18n } = useTranslation();
  const showServiceDurations = useShowServiceDurations();
  return (
    <div className="rounded-3xl border border-white/60 dark:border-brand-700 bg-gradient-to-br from-brand-50/80 via-white/60 to-amber-50/40 dark:bg-brand-700/30 backdrop-blur-md p-4 space-y-2 shadow-lg shadow-brand-500/10">
      <SummaryRow
        label={t('services.book.summary.provider')}
        value={`${t('wellness.title')} · ${t(facility.nameKey)}`}
      />
      <SummaryRow label={t('services.book.summary.offering')} value={t(session.titleKey)} />
      {/* Grid collapses to a single full-width Price row when the
          Service Durations toggle is off. */}
      <div className={`grid ${showServiceDurations ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
        {showServiceDurations && (
          <SummaryRow
            label={t('services.book.summary.duration')}
            value={t('services.providers.offeringDuration', { min: session.durationMin })}
            inline
          />
        )}
        <SummaryRow
          label={t('services.book.summary.price')}
          value={`EGP ${formatNumber(session.priceEgp, i18n.language)}`}
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
                aria-checked={checked ? 'true' : 'false'}
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

function SuccessState({
  facility,
  session,
  onViewRequests,
  onBackToServices,
}: {
  facility: WellnessFacility;
  session: WellnessSession;
  onViewRequests: () => void;
  onBackToServices: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-amber-50/60 via-rose-50/40 to-white dark:from-ink-900 dark:via-ink-900 dark:to-ink-900 px-6 pt-12 pb-8">
      <div className="flex-1 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-700/30 backdrop-blur-md border border-white/60 shadow-xl shadow-emerald-500/20 ring-1 ring-white/40 flex items-center justify-center mb-5 text-emerald-600">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-extrabold text-ink-900 dark:text-white mb-2">
          {t('services.book.success.title')}
        </h2>
        <p className="text-sm text-ink-500 dark:text-ink-100 max-w-sm">
          {t('services.book.success.body', {
            provider: `${t('wellness.title')} · ${t(facility.nameKey)}`,
            min: session.durationMin,
          })}
        </p>
        <p className="mt-3 text-xs text-ink-700 dark:text-ink-100">
          <span className="font-semibold">{t(session.titleKey)}</span>
        </p>
      </div>
      <div className="space-y-2.5">
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
      </div>
    </div>
  );
}
