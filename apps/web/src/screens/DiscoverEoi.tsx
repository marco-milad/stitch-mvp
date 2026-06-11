import { useUser } from '@clerk/clerk-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Check, CheckCircle2, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm, type FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { COMPOUND } from '@/lib/mock/discover';
import { ChipPicker } from '@/components/ui/ChipPicker';
import { InlineNotice, type InlineNoticeData } from '@/components/ui/InlineNotice';
import { BUDGET_RANGES, SOURCES, TIMELINES, UNIT_TYPES } from '@/lib/mock/eoi';
import { submitEoi, type DiscoverInterestType } from '@/lib/residentApi';
import { eoiSchema, type EoiInput } from '@/lib/schemas/eoi';

/**
 * Smart EOI form — Week 3 deliverable.
 *
 * Prefills from Clerk when signed in, then POSTs to the live
 * `/api/v1/discover/eoi` endpoint. On success the backend fans out
 * an admin notification per admin user and we render the success
 * state. The legacy `eoiStore` Zustand + localStorage cache was
 * stripped — submissions now persist server-side end-to-end.
 *
 * Cross-screen handoff (e.g. Calculator → EOI prefill) flows through
 * React Router location state instead, so a refresh on this URL no
 * longer carries a stale draft.
 */
interface EoiPrefillState {
  interestedIn?: DiscoverInterestType;
}

export function DiscoverEoi() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoaded: clerkLoaded } = useUser();
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<InlineNoticeData | null>(null);

  // Read the optional Calculator → EOI handoff payload from navigate state.
  // Frozen at mount so a re-render doesn't keep re-prefilling.
  const prefill = useMemo<EoiPrefillState>(
    () => (location.state as EoiPrefillState | null) ?? {},
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const defaultValues = useMemo<Partial<EoiInput>>(
    () => ({ interestedIn: prefill.interestedIn }),
    [prefill],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    setValue,
    control,
    reset,
  } = useForm<EoiInput>({
    resolver: zodResolver(eoiSchema),
    mode: 'onBlur',
    defaultValues,
  });

  // Prefill from Clerk once it loads — only fields the user hasn't typed in.
  useEffect(() => {
    if (!clerkLoaded || !user) return;
    const patch: Partial<EoiInput> = {};
    if (user.fullName) patch.name = user.fullName;
    if (user.primaryEmailAddress?.emailAddress) {
      patch.email = user.primaryEmailAddress.emailAddress;
    }
    if (user.primaryPhoneNumber?.phoneNumber) {
      patch.phone = user.primaryPhoneNumber.phoneNumber;
    }
    if (Object.keys(patch).length === 0) return;
    Object.entries(patch).forEach(([k, v]) =>
      setValue(k as keyof EoiInput, v, { shouldDirty: false }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkLoaded, user]);

  const mutation = useMutation({
    mutationFn: submitEoi,
    onSuccess: () => {
      reset();
      setSubmitted(true);
    },
    onError: (err: Error) => {
      setNotice({
        tone: 'error',
        message: t('discover.eoi.errors.submitTitle'),
        detail: err.message,
      });
    },
  });

  const onSubmit = (data: EoiInput) => {
    setNotice(null);
    // Map the form's local field names onto the backend wire-format.
    // `interestedIn` → `interestType`; `source` + `consent` aren't part
    // of the spec's persisted schema and are intentionally dropped —
    // add columns + map them in when sales-ops needs source attribution.
    mutation.mutate({
      name: data.name,
      email: data.email,
      phone: data.phone || undefined,
      interestType: data.interestedIn,
      budget: data.budget,
      timeline: data.timeline,
      notes: data.notes || undefined,
    });
  };

  if (submitted) {
    return <SuccessState onDone={() => navigate('/discover')} />;
  }

  return (
    <div className="flex-1 flex flex-col bg-ink-50 dark:bg-ink-900">
      <Header />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-6"
      >
        <InlineNotice notice={notice} onDismiss={() => setNotice(null)} />

        {/* About you */}
        <Section title={t('discover.eoi.sections.about')}>
          <Field label={t('discover.eoi.fields.name.label')} error={errors.name} htmlFor="eoi-name">
            <input
              id="eoi-name"
              type="text"
              autoComplete="name"
              placeholder={t('discover.eoi.fields.name.placeholder')}
              className={inputClass(errors.name)}
              {...register('name')}
            />
          </Field>
          <Field
            label={t('discover.eoi.fields.email.label')}
            error={errors.email}
            htmlFor="eoi-email"
          >
            <input
              id="eoi-email"
              type="email"
              autoComplete="email"
              placeholder={t('discover.eoi.fields.email.placeholder')}
              className={inputClass(errors.email)}
              {...register('email')}
            />
          </Field>
          <Field
            label={t('discover.eoi.fields.phone.label')}
            error={errors.phone}
            htmlFor="eoi-phone"
          >
            <input
              id="eoi-phone"
              type="tel"
              autoComplete="tel"
              placeholder={t('discover.eoi.fields.phone.placeholder')}
              dir="ltr"
              className={inputClass(errors.phone)}
              {...register('phone')}
            />
          </Field>
        </Section>

        {/* What you're looking for */}
        <Section title={t('discover.eoi.sections.interest')}>
          <Field label={t('discover.eoi.fields.interestedIn.label')} error={errors.interestedIn}>
            <Controller
              name="interestedIn"
              control={control}
              render={({ field }) => (
                <ChipPicker options={UNIT_TYPES} value={field.value} onChange={field.onChange} />
              )}
            />
          </Field>
          <Field label={t('discover.eoi.fields.budget.label')} error={errors.budget}>
            <Controller
              name="budget"
              control={control}
              render={({ field }) => (
                <ChipPicker options={BUDGET_RANGES} value={field.value} onChange={field.onChange} />
              )}
            />
          </Field>
          <Field label={t('discover.eoi.fields.timeline.label')} error={errors.timeline}>
            <Controller
              name="timeline"
              control={control}
              render={({ field }) => (
                <ChipPicker options={TIMELINES} value={field.value} onChange={field.onChange} />
              )}
            />
          </Field>
        </Section>

        {/* Extras */}
        <Section title={t('discover.eoi.sections.extras')}>
          <Field
            label={t('discover.eoi.fields.source.label')}
            error={errors.source}
            htmlFor="eoi-source"
          >
            <select
              id="eoi-source"
              className={inputClass(errors.source)}
              {...register('source')}
              defaultValue=""
            >
              <option value="" disabled>
                {t('discover.eoi.fields.source.placeholder')}
              </option>
              {SOURCES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={t('discover.eoi.fields.notes.label')}
            error={errors.notes}
            htmlFor="eoi-notes"
          >
            <textarea
              id="eoi-notes"
              rows={3}
              maxLength={500}
              placeholder={t('discover.eoi.fields.notes.placeholder')}
              className={inputClass(errors.notes)}
              {...register('notes')}
            />
          </Field>

          <ConsentRow control={control} errors={errors} />
        </Section>

        {/* Footer */}
        <div className="pt-2 pb-6 space-y-2">
          {isDirty && !mutation.isPending && (
            <p className="text-[11px] text-ink-500 dark:text-ink-100 text-center">
              {t('discover.eoi.unsavedDraft')}
            </p>
          )}
          <button
            type="submit"
            disabled={mutation.isPending || isSubmitting}
            className="w-full bg-brand-500 disabled:bg-ink-400 rounded-xl py-3.5 text-white font-semibold"
          >
            {mutation.isPending ? t('discover.eoi.submitting') : t('discover.eoi.submit')}
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
        aria-label={t('discover.eoi.close')}
        className="p-2 -ms-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700"
      >
        <X size={22} className="text-ink-700 dark:text-white" />
      </button>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-bold text-ink-900 dark:text-white leading-tight">
          {t('discover.eoi.title')}
        </h2>
        <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">
          {t('discover.eoi.subtitle')}
        </p>
      </div>
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
    'w-full rounded-xl px-4 py-3 text-sm text-ink-900 dark:text-white bg-white dark:bg-ink-700 border outline-none focus:border-brand-500 transition-colors';
  const border = error ? 'border-red-500' : 'border-ink-100 dark:border-ink-700';
  return `${base} ${border}`;
}

function ConsentRow({
  control,
  errors,
}: {
  control: ReturnType<typeof useForm<EoiInput>>['control'];
  errors: FieldErrors<EoiInput>;
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
                {t('discover.eoi.fields.consent.label')}
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

function SuccessState({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex flex-col bg-ink-50 dark:bg-ink-900 px-6 pt-12 pb-8">
      <div className="flex-1 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-5 text-emerald-600">
          <CheckCircle2 size={36} />
        </div>
        <h2 className="text-2xl font-extrabold text-ink-900 dark:text-white mb-2">
          {t('discover.eoi.success.title')}
        </h2>
        <p className="text-sm text-ink-500 dark:text-ink-100 max-w-sm">
          {t('discover.eoi.success.body', { compound: COMPOUND.name })}
        </p>
      </div>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => navigate('/discover/book')}
          className="w-full border border-brand-500 text-brand-600 dark:text-brand-400 rounded-xl py-3 text-sm font-semibold"
        >
          {t('discover.eoi.success.bookCta')}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="w-full bg-brand-500 rounded-xl py-3.5 text-white font-semibold"
        >
          {t('discover.eoi.success.cta')}
        </button>
      </div>
    </div>
  );
}
