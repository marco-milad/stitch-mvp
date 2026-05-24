import { zodResolver } from '@hookform/resolvers/zod';
import { Check, CheckCircle2, Copy, MessageCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  DEFAULT_PERMISSIONS,
  FAMILY_ROLE_VALUES,
  PERMISSION_KEYS,
  familyInviteFormSchema,
  initialsOf,
  pickAvatarColor,
  type FamilyInviteFormInput,
  type FamilyMember,
  type FamilyRole,
} from '@/lib/schemas/family';
import { useCurrentProperty } from '@/stores/propertyStore';
import { useFamilyStore } from '@/stores/familyStore';

export function ProfileFamilyInvite() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const property = useCurrentProperty();
  const addMember = useFamilyStore((s) => s.addMember);
  const [submitted, setSubmitted] = useState<FamilyMember | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
    watch,
    setValue,
    reset,
  } = useForm<FamilyInviteFormInput>({
    resolver: zodResolver(familyInviteFormSchema),
    mode: 'onBlur',
    defaultValues: {
      fullName: '',
      phoneNumber: '',
      email: '',
      role: 'resident',
      permissions: DEFAULT_PERMISSIONS.resident,
    },
  });

  // Auto-fill permissions from role defaults whenever role changes.
  const role = watch('role');
  useEffect(() => {
    setValue('permissions', DEFAULT_PERMISSIONS[role], { shouldDirty: false });
  }, [role, setValue]);

  if (!property) return null;

  const onSubmit = async (data: FamilyInviteFormInput) => {
    await new Promise((r) => setTimeout(r, 350));
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `fam-${Date.now()}`;
    const member: FamilyMember = {
      ...data,
      id,
      propertyId: property.id,
      status: 'pending',
      avatarColor: pickAvatarColor(id),
      invitedAt: new Date().toISOString(),
      activatedAt: null,
    };
    addMember(member);
    reset();
    setSubmitted(member);
  };

  if (submitted) {
    return <SuccessState member={submitted} onDone={() => navigate('/profile/family')} />;
  }

  return (
    <div className="flex-1 flex flex-col bg-ink-50 dark:bg-ink-900">
      {/* Header */}
      <div className="flex flex-row items-center gap-3 px-4 py-3 border-b border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-900">
        <button
          type="button"
          onClick={() => navigate('/profile/family')}
          aria-label={t('family.invite.close')}
          className="p-2 -ms-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700"
        >
          <X size={22} className="text-ink-700 dark:text-white" />
        </button>
        <h2 className="text-base font-bold text-ink-900 dark:text-white leading-tight">
          {t('family.invite.title')}
        </h2>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-6"
      >
        {/* Member details */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
            {t('family.invite.sections.member')}
          </h3>

          <Field
            label={t('family.invite.fields.fullName.label')}
            error={errors.fullName}
            htmlFor="fam-name"
          >
            <input
              id="fam-name"
              type="text"
              autoComplete="name"
              placeholder={t('family.invite.fields.fullName.placeholder')}
              className={inputClass(errors.fullName)}
              {...register('fullName')}
            />
          </Field>

          <Field
            label={t('family.invite.fields.phoneNumber.label')}
            error={errors.phoneNumber}
            htmlFor="fam-phone"
          >
            <input
              id="fam-phone"
              type="tel"
              autoComplete="tel"
              placeholder={t('family.invite.fields.phoneNumber.placeholder')}
              dir="ltr"
              className={inputClass(errors.phoneNumber)}
              {...register('phoneNumber')}
            />
          </Field>

          <Field
            label={t('family.invite.fields.email.label')}
            error={errors.email}
            htmlFor="fam-email"
          >
            <input
              id="fam-email"
              type="email"
              autoComplete="email"
              placeholder={t('family.invite.fields.email.placeholder')}
              className={inputClass(errors.email)}
              {...register('email')}
            />
          </Field>
        </section>

        {/* Role */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
            {t('family.invite.sections.role')}
          </h3>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <div className="flex flex-row flex-wrap gap-2">
                {FAMILY_ROLE_VALUES.map((r) => {
                  const active = field.value === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => field.onChange(r)}
                      aria-pressed={active ? 'true' : 'false'}
                      className={[
                        'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                        active
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-white dark:bg-ink-700 text-ink-700 dark:text-white border-ink-100 dark:border-ink-700 hover:border-brand-400',
                      ].join(' ')}
                    >
                      {t(`family.roles.${r}`)}
                    </button>
                  );
                })}
              </div>
            )}
          />
          {errors.role?.message && (
            <p className="text-[11px] text-red-500" role="alert">
              {t(errors.role.message)}
            </p>
          )}
        </section>

        {/* Permissions */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
            {t('family.invite.sections.permissions')}
          </h3>
          <p className="text-[11px] text-ink-500 dark:text-ink-100">
            {t('family.invite.permissionsHint')}
          </p>
          <Controller
            name="permissions"
            control={control}
            render={({ field }) => (
              <div className="space-y-2 bg-white dark:bg-ink-700 rounded-2xl p-3 border border-ink-100 dark:border-ink-700">
                {PERMISSION_KEYS.map((key) => {
                  const value = field.value[key];
                  return (
                    <label
                      key={key}
                      className="flex flex-row items-center justify-between gap-3 cursor-pointer"
                    >
                      <span className="text-xs text-ink-700 dark:text-ink-100 flex-1">
                        {t(`family.permissions.${key}`)}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={value ? 'true' : 'false'}
                        onClick={() => field.onChange({ ...field.value, [key]: !value })}
                        className={[
                          'relative inline-flex w-10 h-6 rounded-full transition-colors flex-shrink-0',
                          value ? 'bg-brand-500' : 'bg-ink-100 dark:bg-ink-900',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                            value
                              ? 'translate-x-[18px] rtl:-translate-x-[18px]'
                              : 'translate-x-0.5',
                          ].join(' ')}
                        />
                      </button>
                    </label>
                  );
                })}
              </div>
            )}
          />
        </section>

        <div className="pt-2 pb-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-500 disabled:bg-ink-400 rounded-xl py-3.5 text-white font-semibold"
          >
            {isSubmitting ? t('family.invite.submitting') : t('family.invite.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: { message?: string };
  htmlFor?: string;
  children: React.ReactNode;
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

function SuccessState({ member, onDone }: { member: FamilyMember; onDone: () => void }) {
  const { t } = useTranslation();
  const link = `https://stitch.app/invite/${member.id.slice(0, 8)}`;
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // Older browsers / blocked clipboard — fail silent.
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-ink-50 dark:bg-ink-900 px-6 pt-12 pb-8">
      <div className="flex-1 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-5 text-emerald-600">
          <CheckCircle2 size={36} />
        </div>
        <h2 className="text-2xl font-extrabold text-ink-900 dark:text-white mb-2">
          {t('family.invite.success.title')}
        </h2>
        <p className="text-sm text-ink-500 dark:text-ink-100 max-w-sm">
          {t('family.invite.success.body', { name: member.fullName, phone: member.phoneNumber })}
        </p>

        {/* Avatar + initials */}
        <div className="mt-5 flex flex-col items-center gap-2">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-base"
            style={{ backgroundColor: member.avatarColor }}
          >
            {initialsOf(member.fullName)}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-400">
            {t(`family.roles.${member.role as FamilyRole}`)}
          </span>
        </div>

        {/* Activation link */}
        <div className="mt-6 w-full max-w-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-1.5 text-start">
            {t('family.invite.success.linkLabel')}
          </p>
          <div className="flex flex-row items-center gap-2 bg-white dark:bg-ink-700 border border-ink-100 dark:border-ink-700 rounded-xl px-3 py-2.5">
            <span
              className="flex-1 text-xs text-ink-700 dark:text-ink-100 truncate font-mono"
              dir="ltr"
            >
              {link}
            </span>
            <button
              type="button"
              onClick={copyLink}
              aria-label={t('family.actions.copyLink')}
              className="inline-flex items-center gap-1 bg-brand-500 text-white text-[11px] font-semibold rounded-lg px-2 py-1"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              <span>{copied ? t('family.actions.linkCopied') : t('family.actions.copyLink')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => window.alert(t('family.invite.success.comingSoon'))}
          className="w-full inline-flex items-center justify-center gap-2 border border-brand-500 text-brand-600 dark:text-brand-400 rounded-xl py-3 text-sm font-semibold"
        >
          <MessageCircle size={16} />
          {t('family.actions.sendWhatsApp')}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="w-full bg-brand-500 rounded-xl py-3.5 text-white font-semibold"
        >
          {t('family.actions.done')}
        </button>
      </div>
    </div>
  );
}
