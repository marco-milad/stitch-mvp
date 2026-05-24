import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { UnsplashImage } from '@/components/ui/UnsplashImage';
import {
  WELLNESS_FACILITIES,
  getSessionsForFacility,
  type WellnessFacility,
} from '@/lib/mock/wellness';

export function WellnessHub() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      <div className="bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-700">
        <div className="flex flex-row items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/services')}
            aria-label={t('wellness.back')}
            className="p-2 -ms-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700"
          >
            <ArrowLeft size={22} className="text-ink-700 dark:text-white rtl:rotate-180" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-ink-900 dark:text-white leading-tight">
              {t('wellness.title')}
            </h1>
            <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">
              {t('wellness.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {WELLNESS_FACILITIES.map((f) => (
          <FacilityCard
            key={f.id}
            facility={f}
            sessionCount={getSessionsForFacility(f.id).length}
            onClick={() => navigate(`/services/wellness/${f.id}`)}
          />
        ))}
      </div>
    </>
  );
}

function FacilityCard({
  facility,
  sessionCount,
  onClick,
}: {
  facility: WellnessFacility;
  sessionCount: number;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const { icon: Icon } = facility;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full relative overflow-hidden rounded-2xl text-start min-h-[140px] active:scale-[0.99] transition-transform"
      style={{
        background: `linear-gradient(135deg, ${facility.gradient.from}, ${facility.gradient.to})`,
      }}
    >
      {facility.imageUrl && (
        <UnsplashImage
          src={facility.imageUrl}
          alt={t(facility.nameKey)}
          fill
          loading="eager"
          overlayClassName="bg-gradient-to-t from-black/65 via-black/20 to-black/35"
        />
      )}

      <div className="relative p-5 flex flex-row items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur ring-1 ring-white/30 flex items-center justify-center text-white flex-shrink-0">
          <Icon size={26} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-lg font-extrabold leading-tight truncate">
            {t(facility.nameKey)}
          </p>
          <p className="text-white/85 text-xs mt-0.5 truncate">{t(facility.subKey)}</p>
          <p className="text-white/70 text-[11px] mt-2 tabular-nums">{sessionCount} sessions</p>
        </div>
        <ArrowRight color="#fff" size={20} className="flex-shrink-0 rtl:rotate-180" />
      </div>
    </button>
  );
}
