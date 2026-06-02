// /complete-profile — mandatory post-signup onboarding gate.
//
// Required fields per Waterway spec:
//   First Name · Last Name · Phone Number  (text)
//   Profile Photo upload                    (image file → data URL)
//   Service Quality Rating slider (1–10)    (range input)
//
// Layout:
//   - Intro/Onboarding video placeholder at the top (responsive 16:9
//     glass-bordered <video> with a poster, no src yet — drops in
//     when the asset lands).
//   - Form below with ultra-curved glass inputs.
//   - Submit button locked until every required field has a value.
//
// Architecture-honest defaults: NO national ID or passport inputs.
// Anything that captures government-issued IDs is deliberately omitted
// per the client spec.

import { Camera, Check, Loader2, PlayCircle, Star, UserCircle2 } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  isProfileFullyComplete,
  useCompleteProfileStore,
  type CompleteProfileFields,
} from '@/stores/completeProfileStore';

/** Max file size for profile photo (2 MB). Beyond this we reject to
 *  keep localStorage under control — base64 inflation makes large
 *  images a quota hazard. */
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export function CompleteProfile() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const storeFirstName = useCompleteProfileStore((s) => s.firstName);
  const storeLastName = useCompleteProfileStore((s) => s.lastName);
  const storePhone = useCompleteProfileStore((s) => s.phoneNumber);
  const storePhoto = useCompleteProfileStore((s) => s.profilePhotoDataUrl);
  const storeRating = useCompleteProfileStore((s) => s.serviceQualityRating);
  const setFields = useCompleteProfileStore((s) => s.setFields);
  const markComplete = useCompleteProfileStore((s) => s.markComplete);
  const isComplete = useCompleteProfileStore((s) => s.isComplete);

  // Local draft state so typing doesn't write-through to persisted store
  // on every keystroke. We commit on submit.
  const [draft, setDraft] = useState<CompleteProfileFields>({
    firstName: storeFirstName,
    lastName: storeLastName,
    phoneNumber: storePhone,
    profilePhotoDataUrl: storePhoto,
    serviceQualityRating: storeRating,
  });
  const [submitting, setSubmitting] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If the user lands here already complete (devtools toggle, returning
  // user with persisted state), bounce them home. Prevents the stuck
  // "post-onboarding form" experience.
  useEffect(() => {
    if (isComplete) navigate('/', { replace: true });
  }, [isComplete, navigate]);

  const canSubmit = isProfileFullyComplete(draft) && !submitting;

  function onPickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError(t('completeProfile.errors.photoTooBig'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : null;
      setDraft((d) => ({ ...d, profilePhotoDataUrl: url }));
    };
    reader.onerror = () => {
      setPhotoError(t('completeProfile.errors.photoReadFailed'));
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    // No network call yet — Week-2 API wire-up replaces this.
    setFields(draft);
    markComplete();
    navigate('/', { replace: true });
  }

  return (
    // Warm cream wash inherited from the Phase B booking sweep so the
    // gate feels like a native part of the product, not a tacked-on form.
    <div className="flex-1 flex flex-col bg-gradient-to-b from-amber-50/60 via-rose-50/40 to-white dark:from-ink-900 dark:via-ink-900 dark:to-ink-900">
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 max-w-md mx-auto w-full">
        {/* Intro/Onboarding video placeholder — responsive 16:9, deep
            glass border, gradient overlay until the real video lands.
            <video> tag is real (controls + poster) so it's ready to
            drop a src into. */}
        <div className="relative rounded-3xl overflow-hidden border border-white/60 bg-gradient-to-br from-brand-50/80 via-white/60 to-amber-50/40 backdrop-blur-md shadow-lg shadow-brand-500/10 aspect-video">
          <video
            controls
            preload="none"
            className="absolute inset-0 w-full h-full object-cover"
            poster=""
            aria-label={t('completeProfile.video.label')}
          />
          {/* Overlay shown until a real src is attached. Disappears as
              soon as the video starts playing (CSS-only via :hover/focus
              is overkill — keeping it static is honest). */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-gradient-to-br from-brand-500/20 via-violet-500/15 to-rose-500/15 pointer-events-none">
            <div className="w-16 h-16 rounded-3xl bg-white/80 backdrop-blur-md border border-white/60 shadow-xl shadow-ink-900/10 ring-1 ring-white/40 flex items-center justify-center text-brand-700 mb-3">
              <PlayCircle size={32} />
            </div>
            <p className="text-sm font-bold text-ink-900 leading-tight">
              {t('completeProfile.video.title')}
            </p>
            <p className="text-[11px] text-ink-700 mt-1">{t('completeProfile.video.subtitle')}</p>
          </div>
        </div>

        {/* Headline */}
        <header className="text-center">
          <h1 className="text-2xl font-extrabold text-ink-900 dark:text-white leading-tight">
            {t('completeProfile.heading')}
          </h1>
          <p className="text-sm text-ink-500 dark:text-ink-100 mt-1.5">
            {t('completeProfile.lede')}
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Profile photo — mandatory */}
          <div className="rounded-3xl border border-white/60 bg-white/70 dark:bg-ink-700/70 backdrop-blur-md p-4 shadow-md shadow-ink-900/5">
            <div className="flex flex-row items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label={t('completeProfile.photo.pick')}
                className="relative w-20 h-20 rounded-3xl overflow-hidden border-2 border-white/70 bg-gradient-to-br from-amber-100 to-rose-100 shadow-lg shadow-amber-500/20 ring-1 ring-white/50 flex items-center justify-center hover:scale-[1.03] active:scale-95 transition-all duration-300 ease-smooth flex-shrink-0"
              >
                {draft.profilePhotoDataUrl ? (
                  <img
                    src={draft.profilePhotoDataUrl}
                    alt={t('completeProfile.photo.previewAlt')}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCircle2 size={36} className="text-amber-800" />
                )}
                <span className="absolute bottom-1 right-1 w-7 h-7 rounded-2xl bg-white shadow-md flex items-center justify-center border border-white/80">
                  <Camera size={14} className="text-ink-700" />
                </span>
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink-900 dark:text-white">
                  {t('completeProfile.photo.label')} <span className="text-red-500">*</span>
                </p>
                <p className="text-[11px] text-ink-500 dark:text-ink-100 mt-0.5">
                  {t('completeProfile.photo.hint')}
                </p>
                {photoError && (
                  <p className="text-[11px] text-red-600 mt-1" role="alert">
                    {photoError}
                  </p>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onPickPhoto}
              className="sr-only"
            />
          </div>

          {/* Name pair */}
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t('completeProfile.fields.firstName')}
              required
              value={draft.firstName}
              onChange={(v) => setDraft((d) => ({ ...d, firstName: v }))}
              autoComplete="given-name"
            />
            <Field
              label={t('completeProfile.fields.lastName')}
              required
              value={draft.lastName}
              onChange={(v) => setDraft((d) => ({ ...d, lastName: v }))}
              autoComplete="family-name"
            />
          </div>

          {/* Phone — tel input + LTR for Arabic locale legibility */}
          <Field
            label={t('completeProfile.fields.phone')}
            required
            value={draft.phoneNumber}
            onChange={(v) => setDraft((d) => ({ ...d, phoneNumber: v }))}
            type="tel"
            autoComplete="tel"
            placeholder="+20 100 000 0000"
            dir="ltr"
          />

          {/* Service Quality Rating slider — mandatory 1–10 */}
          <div className="rounded-3xl border border-white/60 bg-white/70 dark:bg-ink-700/70 backdrop-blur-md p-4 shadow-md shadow-ink-900/5">
            <div className="flex flex-row items-baseline justify-between mb-2">
              <label htmlFor="cp-rating" className="text-sm font-bold text-ink-900 dark:text-white">
                {t('completeProfile.rating.label')} <span className="text-red-500">*</span>
              </label>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-2xl bg-gradient-to-br from-amber-100 to-rose-100 border border-white/60 text-xs font-bold text-amber-800 tabular-nums">
                <Star size={12} className="fill-amber-500 text-amber-500" />
                {draft.serviceQualityRating ?? '—'}
                <span className="text-ink-500 font-medium">/10</span>
              </span>
            </div>
            <input
              id="cp-rating"
              type="range"
              min={1}
              max={10}
              step={1}
              value={draft.serviceQualityRating ?? 5}
              onChange={(e) =>
                setDraft((d) => ({ ...d, serviceQualityRating: Number(e.target.value) }))
              }
              className="w-full accent-brand-500 cursor-pointer h-2"
            />
            <p className="text-[11px] text-ink-500 dark:text-ink-100 mt-1.5">
              {t('completeProfile.rating.hint')}
            </p>
            {draft.serviceQualityRating === null && (
              <p className="text-[11px] text-amber-700 mt-1" role="alert">
                {t('completeProfile.rating.mustSet')}
              </p>
            )}
          </div>

          {/* Submit — disabled until every required field has a value */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={[
              'w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all duration-300 ease-smooth',
              canSubmit
                ? 'bg-gradient-to-br from-ink-900 to-ink-800 text-white shadow-lg shadow-ink-900/20 hover:shadow-xl hover:shadow-ink-900/30 hover:scale-[1.01] active:scale-[0.99]'
                : 'bg-ink-200 dark:bg-ink-700 text-ink-400 cursor-not-allowed',
            ].join(' ')}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{t('completeProfile.submitting')}</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>{t('completeProfile.submit')}</span>
              </>
            )}
          </button>
          <p className="text-[10px] text-center text-ink-400">{t('completeProfile.legal')}</p>
        </form>
      </div>
    </div>
  );
}

// ─── Curved-glass text field ──────────────────────────────────────────────

function Field({
  label,
  required,
  value,
  onChange,
  type = 'text',
  autoComplete,
  placeholder,
  dir,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'tel' | 'email';
  autoComplete?: string;
  placeholder?: string;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-ink-700 dark:text-ink-100">
        {label}
        {required && <span className="text-red-500 ms-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        dir={dir}
        required={required}
        className="w-full rounded-2xl px-4 py-3 text-sm text-ink-900 dark:text-white bg-white/80 dark:bg-ink-700 backdrop-blur-sm border border-white/60 dark:border-ink-700 shadow-sm shadow-ink-900/5 outline-none focus:border-brand-500 focus:shadow-md focus:shadow-brand-500/15 transition-all duration-300 ease-smooth"
      />
    </div>
  );
}
