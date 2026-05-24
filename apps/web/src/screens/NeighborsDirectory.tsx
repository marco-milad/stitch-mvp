import { ArrowLeft, MessageCircle, Search, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { initialsOf } from '@/lib/schemas/family';
import {
  INTEREST_EMOJI,
  INTEREST_KEYS,
  NEIGHBOR_ROLE_VALUES,
  type Interest,
  type Neighbor,
  type NeighborRole,
} from '@/lib/schemas/neighbors';
import { useCurrentProperty } from '@/stores/propertyStore';
import {
  isImmediate,
  useFilteredNeighbors,
  useImmediateNeighbors,
  useNeighborsStore,
  type InterestFilter,
  type RoleFilter,
} from '@/stores/neighborsStore';

export function NeighborsDirectory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const property = useCurrentProperty();

  const query = useNeighborsStore((s) => s.query);
  const role = useNeighborsStore((s) => s.selectedRole);
  const interest = useNeighborsStore((s) => s.selectedInterest);
  const setQuery = useNeighborsStore((s) => s.setQuery);
  const setRole = useNeighborsStore((s) => s.setRole);
  const setInterest = useNeighborsStore((s) => s.setInterest);
  const reset = useNeighborsStore((s) => s.reset);

  const filtered = useFilteredNeighbors();
  const immediate = useImmediateNeighbors();
  const userZone = property?.zone;
  const hasActiveFilters = query.length > 0 || role !== 'all' || interest !== 'all';

  return (
    <>
      {/* Header */}
      <div className="bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-700 sticky top-0 z-10">
        <div className="flex flex-row items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/community')}
            aria-label={t('neighbors.back')}
            className="p-2 -ms-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700"
          >
            <ArrowLeft size={22} className="text-ink-700 dark:text-white rtl:rotate-180" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-ink-900 dark:text-white leading-tight">
              {t('neighbors.title')}
            </h1>
            <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">
              {t('neighbors.summary', {
                total: filtered.length,
                immediate: immediate.length,
              })}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search
              size={16}
              className="absolute top-1/2 -translate-y-1/2 start-3 text-ink-400 pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('neighbors.search.placeholder')}
              className="w-full ps-9 pe-9 py-2.5 rounded-xl text-sm text-ink-900 dark:text-white bg-ink-50 dark:bg-ink-700 border border-ink-100 dark:border-ink-700 outline-none focus:border-brand-500 transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear"
                className="absolute top-1/2 -translate-y-1/2 end-2 p-1 rounded-md hover:bg-ink-100 dark:hover:bg-ink-900 text-ink-500"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Role chips */}
        <div className="flex flex-row gap-2 overflow-x-auto px-4 pb-2">
          <RoleChip value="all" active={role === 'all'} onClick={() => setRole('all')} />
          {NEIGHBOR_ROLE_VALUES.map((r) => (
            <RoleChip
              key={r}
              value={r}
              active={role === r}
              onClick={() => setRole(role === r ? 'all' : r)}
            />
          ))}
        </div>

        {/* Interest chips */}
        <div className="flex flex-row gap-2 overflow-x-auto px-4 pb-3">
          <InterestChip
            value="all"
            active={interest === 'all'}
            onClick={() => setInterest('all')}
          />
          {INTEREST_KEYS.map((i) => (
            <InterestChip
              key={i}
              value={i}
              active={interest === i}
              onClick={() => setInterest(interest === i ? 'all' : i)}
            />
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="p-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-ink-500 dark:text-ink-100 mb-3">{t('neighbors.empty')}</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={reset}
                className="text-xs font-semibold text-brand-600 dark:text-brand-400"
              >
                {t('neighbors.clearFilters')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((n) => (
              <NeighborCard key={n.id} neighbor={n} isImmediate={isImmediate(n, userZone)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Chips ──────────────────────────────────────────────────────────────

function RoleChip({
  value,
  active,
  onClick,
}: {
  value: RoleFilter;
  active: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const label = value === 'all' ? t('neighbors.filters.all') : t(`neighbors.roles.${value}`);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active ? 'true' : 'false'}
      className={[
        'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
        active
          ? 'bg-ink-900 text-white border-ink-900 dark:bg-white dark:text-ink-900 dark:border-white'
          : 'bg-white dark:bg-ink-700 text-ink-700 dark:text-white border-ink-100 dark:border-ink-700 hover:border-brand-400',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function InterestChip({
  value,
  active,
  onClick,
}: {
  value: InterestFilter;
  active: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const label = value === 'all' ? t('neighbors.filters.all') : t(`neighbors.interests.${value}`);
  const emoji = value === 'all' ? null : INTEREST_EMOJI[value as Interest];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active ? 'true' : 'false'}
      className={[
        'flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
        active
          ? 'bg-brand-500 text-white border-brand-500'
          : 'bg-white dark:bg-ink-700 text-ink-700 dark:text-white border-ink-100 dark:border-ink-700 hover:border-brand-400',
      ].join(' ')}
    >
      {emoji && <span className="text-base leading-none">{emoji}</span>}
      <span>{label}</span>
    </button>
  );
}

// ─── Neighbor card ──────────────────────────────────────────────────────

function NeighborCard({ neighbor, isImmediate }: { neighbor: Neighbor; isImmediate: boolean }) {
  const { t } = useTranslation();
  const { privacy } = neighbor;

  const isPrivate = !privacy.isProfilePublic;
  const initials = isPrivate ? '⋆⋆' : initialsOf(neighbor.name);

  const onMessage = () => {
    window.alert(t('neighbors.card.comingSoon'));
  };

  return (
    <div className="relative bg-white dark:bg-ink-700 rounded-2xl p-3 border border-ink-100 dark:border-ink-700 flex flex-col">
      {/* Immediate badge — pinned to top-end so it doesn't overlap the avatar */}
      {isImmediate && (
        <span className="absolute top-2 end-2 inline-flex items-center gap-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
          <Sparkles size={9} />
          {t('neighbors.card.immediateNeighbor')}
        </span>
      )}

      {/* Avatar */}
      <div
        className={[
          'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm mb-2 flex-shrink-0',
          isPrivate ? 'opacity-60' : '',
        ].join(' ')}
        style={{
          backgroundColor: isPrivate ? '#94A3B8' : neighbor.avatarColor,
        }}
      >
        {initials}
      </div>

      {/* Name + zone/unit */}
      {isPrivate ? (
        <p className="text-xs font-bold text-ink-500 dark:text-ink-100 italic mb-0.5">
          {t('neighbors.card.privateProfile')}
        </p>
      ) : (
        <p className="text-xs font-bold text-ink-900 dark:text-white leading-tight mb-0.5 truncate">
          {neighbor.name}
        </p>
      )}

      <p className="text-[10px] text-ink-500 dark:text-ink-100 leading-tight mb-2">
        {t(`neighbors.zones.${neighbor.zone}`)}
        {' · '}
        {privacy.showUnit ? (
          neighbor.unitName
        ) : (
          <span
            className="inline-block align-middle bg-ink-200 dark:bg-ink-900 rounded text-transparent select-none"
            aria-label={t('neighbors.card.unitHidden')}
          >
            ▮▮▮▮
          </span>
        )}
      </p>

      {/* Role badge */}
      {!isPrivate && (
        <p className="text-[9px] font-bold uppercase tracking-widest text-ink-400 mb-2">
          {t(`neighbors.roleSingular.${neighbor.role}`)}
        </p>
      )}

      {/* Interests */}
      {!isPrivate && neighbor.interests.length > 0 && (
        <div className="flex flex-row flex-wrap gap-1 mb-3">
          {neighbor.interests.slice(0, 3).map((i) => (
            <span
              key={i}
              className="inline-flex items-center gap-0.5 bg-ink-100 dark:bg-ink-900 rounded-full px-1.5 py-0.5 text-[10px]"
              title={t(`neighbors.interests.${i}`)}
            >
              <span className="leading-none">{INTEREST_EMOJI[i]}</span>
            </span>
          ))}
        </div>
      )}

      {/* CTA — spacer pushes it to the bottom of varying-height cards */}
      <div className="mt-auto">
        {isPrivate ? null : privacy.allowDirectMessages ? (
          <button
            type="button"
            onClick={onMessage}
            className="w-full inline-flex items-center justify-center gap-1 bg-brand-500 text-white text-[11px] font-semibold rounded-lg py-1.5 active:scale-95 transition-transform"
          >
            <MessageCircle size={12} />
            {t('neighbors.card.sendMessage')}
          </button>
        ) : (
          <p className="text-[10px] text-ink-400 italic text-center">
            {t('neighbors.card.messagesDisabled')}
          </p>
        )}
      </div>
    </div>
  );
}
