import { ArrowLeft, Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { UnsplashImage } from '@/components/ui/UnsplashImage';
import { formatNumber } from '@/lib/format';
import {
  getFacility,
  getSessionsForFacility,
  type WellnessSession,
  type WellnessFacilityId,
} from '@/lib/mock/wellness';
import { useShowServiceDurations } from '@/stores/featureTogglesStore';

export function WellnessFacility() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { facilityId = '' } = useParams<{ facilityId: string }>();

  const facility = getFacility(facilityId);
  if (!facility) return <Navigate to="/services/wellness" replace />;

  const sessions = getSessionsForFacility(facility.id as WellnessFacilityId);
  const { icon: Icon } = facility;

  return (
    <>
      {/* Hero */}
      <div
        className="relative min-h-[180px] flex flex-col"
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
            overlayClassName="bg-gradient-to-t from-black/70 via-black/30 to-black/30"
          />
        )}
        <div className="relative flex flex-row items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/services/wellness')}
            aria-label={t('wellness.back')}
            className="p-2 -ms-2 rounded-lg hover:bg-white/10"
          >
            <ArrowLeft size={22} className="text-white rtl:rotate-180" />
          </button>
        </div>
        <div className="relative flex flex-row items-center gap-3 px-4 pt-2 pb-5 mt-auto">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur ring-1 ring-white/30 flex items-center justify-center text-white flex-shrink-0">
            <Icon size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-xl font-extrabold truncate">{t(facility.nameKey)}</h1>
            <p className="text-white/85 text-xs truncate">{t(facility.subKey)}</p>
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div className="p-4 space-y-3">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
          {t('wellness.facility.sessionsTitle')}
        </h3>
        {sessions.length === 0 ? (
          <p className="text-sm text-ink-500 dark:text-ink-100">
            {t('wellness.facility.noSessions')}
          </p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                onClick={() => navigate(`/services/wellness/${facility.id}/book?session=${s.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function SessionRow({ session, onClick }: { session: WellnessSession; onClick: () => void }) {
  const { t, i18n } = useTranslation();
  const showServiceDurations = useShowServiceDurations();
  return (
    <div className="flex flex-row items-start gap-3 bg-white dark:bg-ink-700 rounded-2xl p-3 border border-ink-100 dark:border-ink-700">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink-900 dark:text-white truncate">
          {t(session.titleKey)}
        </p>
        <div className="mt-1 flex flex-row flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-500 dark:text-ink-100">
          {showServiceDurations && (
            <span className="inline-flex items-center gap-1">
              <Clock size={11} />
              {t('services.providers.offeringDuration', { min: session.durationMin })}
            </span>
          )}
          {session.instructorKey && (
            <span className="inline-flex items-center gap-1">
              <User size={11} />
              {t('wellness.session.instructorWith', { name: t(session.instructorKey) })}
            </span>
          )}
          {session.scheduleKey && (
            <span className="inline-flex items-center gap-1">
              <CalendarIcon size={11} />
              {t(session.scheduleKey)}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs font-semibold text-brand-600 dark:text-brand-400 tabular-nums">
          EGP {formatNumber(session.priceEgp, i18n.language)}
        </p>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="ms-2 bg-brand-500 text-white rounded-xl px-3 py-1.5 text-xs font-semibold flex-shrink-0"
      >
        {t('wellness.facility.bookSession')}
      </button>
    </div>
  );
}
