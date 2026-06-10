// Family & Residents Hub — sand/ink panel that lists the unit's
// roster + carries an inline add-member form.
//
// Wired to:
//   - GET  /api/v1/me/family       via TanStack Query (5 s stale-while-revalidate)
//   - POST /api/v1/me/family       via mutation; on success the cache
//                                   is invalidated so the new row
//                                   slides in via the same stagger
//                                   the existing rows used on mount
//
// Backend enforces the unique (unit_id, phone) constraint, so the
// form maps a 409 response to a tailored inline notice ("this number
// is already on the roster"). Other failures fall back to the generic
// "could not add — {message}" string.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { Loader2, Phone as PhoneIcon, Plus, User as UserIcon, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InlineNotice, type InlineNoticeData } from '@/components/ui/InlineNotice';
import {
  createFamilyMember,
  listFamilyMembers,
  type FamilyMember,
  type FamilyRelationship,
} from '@/lib/residentApi';
import { residentQueryOptions } from '@/lib/useResidentQuery';

const FAMILY_QUERY_KEY = ['me', 'family'] as const;

const RELATIONSHIPS: readonly FamilyRelationship[] = [
  'spouse',
  'child',
  'parent',
  'tenant',
  'other',
];

// Tone per relationship — soft, sand-friendly chips. ink-950 reserved
// for the primary CTA so each row stays restrained per Rule 5.
const RELATIONSHIP_TONE: Record<FamilyRelationship, { bg: string; fg: string }> = {
  spouse: { bg: 'bg-rose-100', fg: 'text-rose-700' },
  child: { bg: 'bg-sky-100', fg: 'text-sky-700' },
  parent: { bg: 'bg-amber-100', fg: 'text-amber-700' },
  tenant: { bg: 'bg-violet-100', fg: 'text-violet-700' },
  other: { bg: 'bg-sand-200', fg: 'text-ink-700' },
};

const LIST_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] },
  },
};

const FORM_VARIANTS: Variants = {
  hidden: { opacity: 0, height: 0 },
  show: {
    opacity: 1,
    height: 'auto',
    transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] },
  },
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function FamilyHub() {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);

  const query = useQuery<FamilyMember[]>({
    queryKey: FAMILY_QUERY_KEY,
    queryFn: listFamilyMembers,
    // Family roster changes infrequently — once a day at most. The
    // 60s stale window keeps the panel responsive without hammering
    // the backend like the 5s polling hubs do.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    ...residentQueryOptions<FamilyMember[]>(),
  });

  const members = query.data ?? [];

  return (
    <section className="mx-4 mb-4">
      <header className="flex items-end justify-between mb-2.5">
        <div className="flex flex-col">
          <h3 className="text-heading-lg text-ink-950 dark:text-white">{t('family.hub.title')}</h3>
          <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">
            {t('family.hub.subtitle', { count: members.length })}
          </p>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ink-950 dark:bg-white text-white dark:text-ink-950 text-[11px] font-bold uppercase tracking-wider shadow-sm hover:shadow-md active:scale-95 transition-all duration-base ease-smooth"
          >
            <Plus size={12} />
            {t('family.hub.add')}
          </button>
        )}
      </header>

      <div className="bg-white dark:bg-ink-700 rounded-3xl border border-sand-200/60 dark:border-ink-700 shadow-sm overflow-hidden">
        <AnimatePresence initial={false}>
          {adding && (
            <motion.div
              key="form"
              variants={FORM_VARIANTS}
              initial="hidden"
              animate="show"
              exit="exit"
              className="overflow-hidden border-b border-sand-200/60 dark:border-ink-700"
            >
              <AddMemberForm onClose={() => setAdding(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {query.isLoading ? (
          <div className="flex items-center justify-center py-10 text-ink-500 dark:text-ink-100">
            <Loader2 size={18} className="animate-spin me-2" />
            <span className="text-sm">{t('family.hub.loading')}</span>
          </div>
        ) : members.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.ul
            variants={LIST_VARIANTS}
            initial="hidden"
            animate="show"
            role="list"
            className="divide-y divide-sand-200/60 dark:divide-ink-700"
          >
            {members.map((m) => (
              <motion.li
                key={m.id}
                variants={ITEM_VARIANTS}
                className="px-4 py-3 flex flex-row items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-sand-100 dark:bg-ink-700 flex items-center justify-center flex-shrink-0 text-ink-700 dark:text-ink-100 text-sm font-bold tracking-tight">
                  {initials(m.name) || <UserIcon size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink-950 dark:text-white truncate">
                    {m.name}
                  </p>
                  <p className="text-[11px] text-ink-500 dark:text-ink-100 inline-flex items-center gap-1">
                    <PhoneIcon size={10} />
                    <span dir="ltr" className="tabular-nums">
                      {m.phone}
                    </span>
                  </p>
                </div>
                <RelationshipPill relationship={m.relationship} />
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </section>
  );
}

function RelationshipPill({ relationship }: { relationship: FamilyRelationship }) {
  const { t } = useTranslation();
  const tone = RELATIONSHIP_TONE[relationship];
  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0',
        tone.bg,
        tone.fg,
      ].join(' ')}
    >
      {t(`family.hub.relationships.${relationship}`)}
    </span>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="px-4 py-10 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sand-100 text-ink-500 mb-3">
        <Users size={20} />
      </div>
      <p className="text-sm font-semibold text-ink-950 dark:text-white">
        {t('family.hub.empty.title')}
      </p>
      <p className="text-[11px] text-ink-500 dark:text-ink-100 mt-0.5">
        {t('family.hub.empty.body')}
      </p>
    </div>
  );
}

// ─── Add form ──────────────────────────────────────────────────────────────

function AddMemberForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState<FamilyRelationship>('spouse');
  const [notice, setNotice] = useState<InlineNoticeData | null>(null);

  const mutation = useMutation({
    mutationFn: createFamilyMember,
    onSuccess: () => {
      // Cache invalidate → list re-fetches and the new row enters via
      // the stagger animation. Close the form on the next frame so the
      // success animation is visible.
      void qc.invalidateQueries({ queryKey: FAMILY_QUERY_KEY });
      onClose();
    },
    onError: (err: Error) => {
      const msg = err.message ?? '';
      if (msg.startsWith('409')) {
        setNotice({
          tone: 'error',
          message: t('family.hub.errors.duplicate'),
          detail: msg,
        });
      } else if (msg.startsWith('400')) {
        setNotice({
          tone: 'error',
          message: t('family.hub.errors.noUnit'),
        });
      } else {
        setNotice({
          tone: 'error',
          message: t('family.hub.errors.generic', { message: msg }),
        });
      }
    },
  });

  const canSubmit = useMemo(() => {
    return name.trim().length > 0 && phone.trim().length >= 4 && !mutation.isPending;
  }, [name, phone, mutation.isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (!canSubmit) return;
    mutation.mutate({
      name: name.trim(),
      phone: phone.trim(),
      relationship,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 py-4 space-y-3 bg-sand-50/60 dark:bg-ink-900/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-ink-950 dark:text-white">
          {t('family.hub.form.title')}
        </h4>
        <button
          type="button"
          onClick={onClose}
          disabled={mutation.isPending}
          aria-label={t('family.hub.form.cancel')}
          className="p-1 -m-1 rounded-md text-ink-500 hover:bg-sand-200/60 dark:hover:bg-ink-700 disabled:opacity-40"
        >
          <X size={14} />
        </button>
      </div>

      <InlineNotice notice={notice} onDismiss={() => setNotice(null)} />

      <Field label={t('family.hub.form.name')}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('family.hub.form.namePlaceholder')}
          maxLength={120}
          required
          aria-label={t('family.hub.form.name')}
          className="w-full px-3 py-2.5 rounded-xl border border-sand-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-sm text-ink-950 dark:text-white focus:outline-none focus:border-ink-400"
        />
      </Field>

      <Field label={t('family.hub.form.relationship')}>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {RELATIONSHIPS.map((r) => {
            const active = relationship === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRelationship(r)}
                aria-pressed={active ? 'true' : 'false'}
                className={[
                  'px-2 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all duration-base ease-smooth',
                  active
                    ? 'bg-ink-950 dark:bg-white text-white dark:text-ink-950 border-ink-950 dark:border-white shadow-sm'
                    : 'bg-white dark:bg-ink-900 text-ink-700 dark:text-ink-100 border-sand-200 dark:border-ink-700 hover:border-ink-400',
                ].join(' ')}
              >
                {t(`family.hub.relationships.${r}`)}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label={t('family.hub.form.phone')}>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t('family.hub.form.phonePlaceholder')}
          maxLength={32}
          required
          dir="ltr"
          aria-label={t('family.hub.form.phone')}
          className="w-full px-3 py-2.5 rounded-xl border border-sand-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-sm text-ink-950 dark:text-white tabular-nums focus:outline-none focus:border-ink-400"
        />
      </Field>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={mutation.isPending}
          className="flex-1 px-4 py-2.5 rounded-xl border border-sand-200 dark:border-ink-700 text-ink-700 dark:text-ink-100 text-sm font-semibold hover:shadow-sm active:scale-[0.99] transition-all duration-base ease-smooth disabled:opacity-50"
        >
          {t('family.hub.form.cancel')}
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-ink-950 dark:bg-white text-white dark:text-ink-950 text-sm font-bold shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-base ease-smooth disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
          {mutation.isPending ? t('family.hub.form.submitting') : t('family.hub.form.submit')}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500 dark:text-ink-300">
        {label}
      </span>
      {children}
    </label>
  );
}
