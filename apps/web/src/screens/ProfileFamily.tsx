import { ArrowLeft, Check, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  PERMISSION_KEYS,
  countEnabled,
  initialsOf,
  type FamilyMember,
  type FamilyPermissions,
  type PermissionKey,
} from '@/lib/schemas/family';
import { useFamilyStore, useMembersForCurrentProperty } from '@/stores/familyStore';

export function ProfileFamily() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const members = useMembersForCurrentProperty();
  const removeMember = useFamilyStore((s) => s.removeMember);
  const resendInvite = useFamilyStore((s) => s.resendInvite);

  const { active, pending } = useMemo(() => {
    const a: FamilyMember[] = [];
    const p: FamilyMember[] = [];
    for (const m of members) (m.status === 'pending' ? p : a).push(m);
    return { active: a, pending: p };
  }, [members]);

  return (
    <>
      <div className="bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-700">
        <div className="flex flex-row items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            aria-label={t('family.back')}
            className="p-2 -ms-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700"
          >
            <ArrowLeft size={22} className="text-ink-700 dark:text-white rtl:rotate-180" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-ink-900 dark:text-white leading-tight">
              {t('family.title')}
            </h1>
            <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">
              {t('family.summary.members', { count: members.length })}
              {pending.length > 0 && ` · ${t('family.summary.pending', { count: pending.length })}`}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        <button
          type="button"
          onClick={() => navigate('/profile/family/invite')}
          className="w-full inline-flex items-center justify-center gap-2 bg-brand-500 text-white font-semibold rounded-xl py-3"
        >
          <Plus size={18} />
          <span>{t('family.actions.invite')}</span>
        </button>

        {members.length === 0 ? (
          <p className="text-sm text-ink-500 dark:text-ink-100 text-center mt-4">
            {t('family.empty')}
          </p>
        ) : (
          <>
            {active.length > 0 && (
              <Section title={t('family.sections.active')}>
                {active.map((m) => (
                  <MemberCard key={m.id} member={m} onRemove={() => removeMember(m.id)} />
                ))}
              </Section>
            )}

            {pending.length > 0 && (
              <Section title={t('family.sections.pending')}>
                {pending.map((m) => (
                  <PendingCard
                    key={m.id}
                    member={m}
                    onResend={() => resendInvite(m.id)}
                    onCancel={() => removeMember(m.id)}
                  />
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-400">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function MemberCard({ member, onRemove }: { member: FamilyMember; onRemove: () => void }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const togglePermission = useFamilyStore((s) => s.togglePermission);

  return (
    <div className="bg-white dark:bg-ink-700 rounded-2xl border border-ink-100 dark:border-ink-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded ? 'true' : 'false'}
        className="w-full flex flex-row items-center gap-3 p-3 text-start"
      >
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: member.avatarColor }}
        >
          {initialsOf(member.fullName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink-900 dark:text-white truncate">
            {member.fullName}
          </p>
          <p className="text-[11px] text-ink-500 dark:text-ink-100">
            {t(`family.roles.${member.role}`)}
          </p>
          <p className="text-[10px] text-ink-500 dark:text-ink-100 mt-0.5">
            {t('family.permissionsSummary', {
              n: countEnabled(member.permissions),
              total: PERMISSION_KEYS.length,
            })}
          </p>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-ink-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-ink-400 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-ink-100 dark:border-ink-700 p-3 space-y-2 bg-ink-50 dark:bg-ink-900/30">
          {PERMISSION_KEYS.map((key) => (
            <PermissionRow
              key={key}
              labelKey={`family.permissions.${key}`}
              value={member.permissions[key]}
              onToggle={() => togglePermission(member.id, key)}
            />
          ))}
          <button
            type="button"
            onClick={onRemove}
            className="w-full mt-2 inline-flex items-center justify-center gap-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl py-2"
          >
            <X size={14} />
            {t('family.actions.remove')}
          </button>
        </div>
      )}
    </div>
  );
}

function PermissionRow({
  labelKey,
  value,
  onToggle,
}: {
  labelKey: string;
  value: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <label className="flex flex-row items-center justify-between gap-3 cursor-pointer">
      <span className="text-xs text-ink-700 dark:text-ink-100 flex-1">{t(labelKey)}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value ? 'true' : 'false'}
        onClick={onToggle}
        className={[
          'relative inline-flex w-10 h-6 rounded-full transition-colors flex-shrink-0',
          value ? 'bg-brand-500' : 'bg-ink-100 dark:bg-ink-700',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
            value ? 'translate-x-[18px] rtl:-translate-x-[18px]' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </label>
  );
}

function PendingCard({
  member,
  onResend,
  onCancel,
}: {
  member: FamilyMember;
  onResend: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-ink-700 rounded-2xl border border-ink-100 dark:border-ink-700 p-3">
      <div className="flex flex-row items-center gap-3 mb-3">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 opacity-70"
          style={{ backgroundColor: member.avatarColor }}
        >
          {initialsOf(member.fullName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink-900 dark:text-white truncate">
            {member.fullName}
          </p>
          <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">
            {t(`family.roles.${member.role}`)}
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            <Check size={10} />
            {t('family.inviteSent')}
          </p>
        </div>
      </div>
      <div className="flex flex-row gap-2">
        <button
          type="button"
          onClick={onResend}
          className="flex-1 bg-brand-500 text-white text-xs font-semibold rounded-xl py-2"
        >
          {t('family.actions.resend')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl py-2"
        >
          {t('family.actions.cancel')}
        </button>
      </div>
    </div>
  );
}
