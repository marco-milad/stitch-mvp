import { useUser } from '@clerk/clerk-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, CheckCircle2, X, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm, type FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { AdvisorPicker } from '@/components/booking/AdvisorPicker';
import { Calendar } from '@/components/booking/Calendar';
import { OtelBookingButton } from '@/components/booking/OtelBookingButton';
import { TimeSlotPicker } from '@/components/booking/TimeSlotPicker';
import { formatFullDate, fromDateIso, toDateIso } from '@/lib/dates';
import { ADVISORS, ANY_ADVISOR_ID, VISIT_TYPES, formatSlotRange } from '@/lib/mock/booking';
import { bookingSchema, type BookingInput, type VisitType } from '@/lib/schemas/booking';
import { useBookingStore } from '@/stores/bookingStore';

/**
 * Book-a-visit form — Week 3 deliverable.
 * Calendar excludes Fridays for showroom + onsite visits (Egyptian weekend).
 * TODO: POST /api/v1/discover/bookings once the backend endpoint exists.
 */
export function DiscoverBook() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoaded: clerkLoaded } = useUser();
  const { draft, setDraft, addSubmission } = useBookingStore();
  const [submitted, setSubmitted] = useState<BookingInput | null>(null);

  const defaultValues = useMemo<Partial<BookingInput>>(
    () => ({ advisorId: ANY_ADVISOR_ID, ...draft }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    watch,
    setValue,
    control,
    reset,
  } = useForm<BookingInput>({
    resolver: zodResolver(bookingSchema),
    mode: 'onBlur',
    defaultValues,
  });

  const visitType = watch('visitType');
  const dateIso = watch('dateIso');
  const selectedDate = useMemo(() => (dateIso ? fromDateIso(dateIso) : null), [dateIso]);

  // Friday disable rule: applies to showroom + onsite only.
  const isDisabled = useMemo(() => {
    if (visitType === 'virtual') return undefined;
    return (date: Date) => date.getDay() === 5;
  }, [visitType]);

  // Clerk prefill — only into fields the user hasn't typed in.
  useEffect(() => {
    if (!clerkLoaded || !user) return;
    if (!draft.name && user.fullName) setValue('name', user.fullName, { shouldDirty: false });
    if (!draft.email && user.primaryEmailAddress?.emailAddress) {
      setValue('email', user.primaryEmailAddress.emailAddress, { shouldDirty: false });
    }
    if (!draft.phone && user.primaryPhoneNumber?.phoneNumber) {
      setValue('phone', user.primaryPhoneNumber.phoneNumber, { shouldDirty: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkLoaded, user]);

  // Auto-save draft on every change.
  useEffect(() => {
    const sub = watch((value) => setDraft(value as Partial<BookingInput>));
    return () => sub.unsubscribe();
  }, [watch, setDraft]);

  // Changing visit type or date invalidates the previously-picked slot.
  useEffect(() => {
    setValue('timeSlot', '' as BookingInput['timeSlot'], { shouldDirty: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitType, dateIso]);

  const onSubmit = async (data: BookingInput) => {
    await new Promise((r) => setTimeout(r, 350)); // simulated latency
    addSubmission(data);
    reset();
    setSubmitted(data);
  };

  if (submitted) {
    return <SuccessState submission={submitted} onDone={() => navigate('/discover')} />;
  }

  return (
    // Warm cream wash matches ServiceBook + WellnessBook so all three
    // booking surfaces speak the same visual language.
    <div className="flex-1 flex flex-col bg-gradient-to-b from-amber-50/60 via-rose-50/40 to-white dark:from-ink-900 dark:via-ink-900 dark:to-ink-900">
      <Header />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-6"
      >
        {/* Visit type */}
        <Section title={t('discover.book.sections.visit')}>
          <Controller
            name="visitType"
            control={control}
            render={({ field }) => (
              <div className="space-y-2">
                {VISIT_TYPES.map((opt) => (
                  <VisitTypeCard
                    key={opt.value}
                    icon={opt.icon}
                    title={t(opt.labelKey)}
                    sub={t(opt.subKey)}
                    active={field.value === opt.value}
                    onClick={() => field.onChange(opt.value)}
                  />
                ))}
              </div>
            )}
          />
          {errors.visitType?.message && (
            <p className="mt-2 text-[11px] text-red-500" role="alert">
              {t(errors.visitType.message)}
            </p>
          )}
        </Section>

        {/* Date */}
        <Section title={t('discover.book.sections.date')}>
          <Controller
            name="dateIso"
            control={control}
            render={({ field }) => (
              <Calendar
                value={field.value ? fromDateIso(field.value) : null}
                isDisabled={isDisabled}
                onChange={(d) => field.onChange(toDateIso(d))}
              />
            )}
          />
          {errors.dateIso?.message && (
            <p className="mt-2 text-[11px] text-red-500" role="alert">
              {t(errors.dateIso.message)}
            </p>
          )}
        </Section>

        {/* Time slots */}
        <Section title={t('discover.book.slotsTitle')}>
          <Controller
            name="timeSlot"
            control={control}
            render={({ field }) => (
              <TimeSlotPicker
                date={selectedDate}
                visitType={visitType}
                value={field.value || undefined}
                onChange={field.onChange}
              />
            )}
          />
          {errors.timeSlot?.message && (
            <p className="mt-2 text-[11px] text-red-500" role="alert">
              {t(errors.timeSlot.message)}
            </p>
          )}
        </Section>

        {/* Advisor */}
        <Section title={t('discover.book.advisorTitle')}>
          <Controller
            name="advisorId"
            control={control}
            render={({ field }) => (
              <AdvisorPicker value={field.value || ANY_ADVISOR_ID} onChange={field.onChange} />
            )}
          />
        </Section>

        {/* Contact */}
        <Section title={t('discover.book.sections.contact')}>
          <Field
            label={t('discover.book.fields.name.label')}
            error={errors.name}
            htmlFor="book-name"
          >
            <input
              id="book-name"
              type="text"
              autoComplete="name"
              placeholder={t('discover.book.fields.name.placeholder')}
              className={inputClass(errors.name)}
              {...register('name')}
            />
          </Field>
          <Field
            label={t('discover.book.fields.email.label')}
            error={errors.email}
            htmlFor="book-email"
          >
            <input
              id="book-email"
              type="email"
              autoComplete="email"
              placeholder={t('discover.book.fields.email.placeholder')}
              className={inputClass(errors.email)}
              {...register('email')}
            />
          </Field>
          <Field
            label={t('discover.book.fields.phone.label')}
            error={errors.phone}
            htmlFor="book-phone"
          >
            <input
              id="book-phone"
              type="tel"
              autoComplete="tel"
              placeholder={t('discover.book.fields.phone.placeholder')}
              dir="ltr"
              className={inputClass(errors.phone)}
              {...register('phone')}
            />
          </Field>
          <Field
            label={t('discover.book.fields.notes.label')}
            error={errors.notes}
            htmlFor="book-notes"
          >
            <textarea
              id="book-notes"
              rows={3}
              maxLength={500}
              placeholder={t('discover.book.fields.notes.placeholder')}
              className={inputClass(errors.notes)}
              {...register('notes')}
            />
          </Field>

          <ConsentRow control={control} errors={errors} />
        </Section>

        <div className="pt-2 pb-6 space-y-2">
          {isDirty && (
            <p className="text-[11px] text-ink-500 dark:text-ink-100 text-center">
              {t('discover.book.draftSaved')}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-br from-ink-900 to-ink-800 disabled:from-ink-400 disabled:to-ink-400 rounded-2xl py-3.5 text-white font-semibold shadow-lg shadow-ink-900/20 hover:shadow-xl hover:shadow-ink-900/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 ease-smooth"
          >
            {isSubmitting ? t('discover.book.submitting') : t('discover.book.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="flex flex-row items-center gap-3 px-4 py-3 border-b border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-900">
      <button
        type="button"
        onClick={() => navigate('/discover')}
        aria-label={t('discover.book.close')}
        className="w-10 h-10 -ms-2 rounded-2xl flex items-center justify-center bg-white/70 dark:bg-ink-700/70 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-sm shadow-ink-900/5 hover:bg-white hover:scale-105 active:scale-95 transition-all duration-300 ease-smooth"
      >
        <X size={20} className="text-ink-700 dark:text-white" />
      </button>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-bold text-ink-900 dark:text-white leading-tight">
          {t('discover.book.title')}
        </h2>
        <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">
          {t('discover.book.subtitle')}
        </p>
      </div>
      <OtelBookingButton compact />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-400">{title}</h3>
      {children}
    </section>
  );
}

function VisitTypeCard({
  icon: Icon,
  title,
  sub,
  active,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active ? 'true' : 'false'}
      className={[
        'w-full flex flex-row items-center text-start rounded-3xl p-4 border backdrop-blur-md transition-all duration-300 ease-smooth',
        active
          ? 'border-brand-400 bg-gradient-to-br from-brand-50/80 to-white/60 dark:bg-brand-700/30 shadow-lg shadow-brand-500/15 scale-[1.01]'
          : 'border-white/50 bg-white/70 dark:bg-ink-700/70 dark:border-ink-700 shadow-md shadow-ink-900/5 hover:border-brand-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-ink-900/10',
      ].join(' ')}
    >
      <div
        className={[
          'w-11 h-11 rounded-2xl flex items-center justify-center me-3 flex-shrink-0 transition-all duration-300 ease-smooth',
          active
            ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/30 ring-1 ring-white/40'
            : 'bg-white/80 backdrop-blur-sm border border-white/60 text-ink-500',
        ].join(' ')}
      >
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink-900 dark:text-white truncate">{title}</p>
        <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">{sub}</p>
      </div>
      {active && (
        <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center text-white ms-2 flex-shrink-0">
          <Check size={12} />
        </div>
      )}
    </button>
  );
}

function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: { message?: string };
  htmlFor?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold text-ink-700 dark:text-ink-100 mb-1.5"
      >
        {label}
      </label>
      {children}
      {error?.message && (
        <p className="mt-1 text-[11px] text-red-500" role="alert">
          {t(error.message)}
        </p>
      )}
    </div>
  );
}

function inputClass(error?: unknown): string {
  const base =
    'w-full rounded-2xl px-4 py-3 text-sm text-ink-900 dark:text-white bg-white/80 dark:bg-ink-700 backdrop-blur-sm border shadow-sm shadow-ink-900/5 outline-none focus:border-brand-500 focus:shadow-md focus:shadow-brand-500/15 transition-all duration-300 ease-smooth';
  const border = error ? 'border-red-500' : 'border-ink-100 dark:border-ink-700';
  return `${base} ${border}`;
}

function ConsentRow({
  control,
  errors,
}: {
  control: ReturnType<typeof useForm<BookingInput>>['control'];
  errors: FieldErrors<BookingInput>;
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
                {t('discover.book.fields.consent.label')}
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

function SuccessState({ submission, onDone }: { submission: BookingInput; onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const date = fromDateIso(submission.dateIso);
  const dateLabel = date ? formatFullDate(date, i18n.language) : submission.dateIso;
  const visitTypeLabel = t(
    VISIT_TYPES.find((v) => v.value === submission.visitType)?.labelKey ?? '',
  );
  const advisorName =
    submission.advisorId === ANY_ADVISOR_ID
      ? t('discover.book.advisors.any')
      : (ADVISORS.find((a) => a.id === submission.advisorId)?.name ?? '');

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-amber-50/60 via-rose-50/40 to-white dark:from-ink-900 dark:via-ink-900 dark:to-ink-900 px-6 pt-12 pb-8">
      <div className="flex-1 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-700/30 backdrop-blur-md border border-white/60 shadow-xl shadow-emerald-500/20 ring-1 ring-white/40 flex items-center justify-center mb-5 text-emerald-600">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-extrabold text-ink-900 dark:text-white mb-2">
          {t('discover.book.success.title')}
        </h2>
        <p className="text-sm text-ink-500 dark:text-ink-100 max-w-sm">
          {t('discover.book.success.body', {
            slot: formatSlotRange(submission.timeSlot),
            date: dateLabel,
            visitType: visitTypeLabel.toLowerCase(),
          })}
        </p>
        {advisorName && (
          <p className="mt-3 text-xs text-ink-700 dark:text-ink-100">
            <span className="font-semibold">{advisorName}</span>
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDone}
        className="w-full bg-gradient-to-br from-ink-900 to-ink-800 rounded-2xl py-3.5 text-white font-semibold shadow-lg shadow-ink-900/20 hover:shadow-xl hover:shadow-ink-900/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 ease-smooth"
      >
        {t('discover.book.success.cta')}
      </button>
    </div>
  );
}
