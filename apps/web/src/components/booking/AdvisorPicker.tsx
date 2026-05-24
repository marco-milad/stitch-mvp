import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ADVISORS, ANY_ADVISOR_ID, type Advisor } from '@/lib/mock/booking';

interface Props {
  value: string;
  onChange: (advisorId: string) => void;
}

/**
 * Horizontal scroll of advisor avatar cards. Synthetic "Any advisor"
 * option is prepended in the picker so the ADVISORS list stays clean.
 */
export function AdvisorPicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-row gap-2 overflow-x-auto -mx-1 px-1 pb-1 snap-x">
      <AnyCard active={value === ANY_ADVISOR_ID} onClick={() => onChange(ANY_ADVISOR_ID)} />
      {ADVISORS.map((a) => (
        <AdvisorCard
          key={a.id}
          advisor={a}
          active={value === a.id}
          onClick={() => onChange(a.id)}
        />
      ))}
    </div>
  );
}

function AnyCard({ active, onClick }: { active: boolean; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active ? 'true' : 'false'}
      className={cardClass(active)}
    >
      <div
        className={[
          'w-12 h-12 rounded-full flex items-center justify-center mb-1.5 text-white',
          active ? 'bg-brand-500' : 'bg-ink-400',
        ].join(' ')}
      >
        <Sparkles size={20} />
      </div>
      <p className="text-[11px] font-bold text-ink-900 dark:text-white leading-tight">
        {t('discover.book.advisors.any')}
      </p>
      <p className="text-[10px] text-ink-500 dark:text-ink-100 mt-0.5">
        {t('discover.book.advisors.anySub')}
      </p>
    </button>
  );
}

function AdvisorCard({
  advisor,
  active,
  onClick,
}: {
  advisor: Advisor;
  active: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active ? 'true' : 'false'}
      className={cardClass(active)}
    >
      <div
        className={[
          'w-12 h-12 rounded-full flex items-center justify-center mb-1.5 text-white font-bold text-sm',
          active ? 'bg-brand-500' : 'bg-gradient-to-br from-accent to-brand-500',
        ].join(' ')}
      >
        {advisor.initials}
      </div>
      <p className="text-[11px] font-bold text-ink-900 dark:text-white leading-tight truncate w-full">
        {advisor.name}
      </p>
      <p className="text-[10px] text-ink-500 dark:text-ink-100 mt-0.5 truncate w-full">
        {t(advisor.specialtyKey)}
      </p>
      <div className="flex flex-row gap-1 mt-1.5">
        {advisor.languages.map((lng) => (
          <span
            key={lng}
            className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase bg-ink-100 dark:bg-ink-900 text-ink-500"
          >
            {lng}
          </span>
        ))}
      </div>
    </button>
  );
}

function cardClass(active: boolean): string {
  return [
    'snap-start flex-shrink-0 w-28 rounded-xl p-3 text-center border transition-all',
    active
      ? 'border-brand-500 bg-brand-50 dark:bg-brand-700/30'
      : 'border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-700 hover:border-brand-400',
  ].join(' ');
}
