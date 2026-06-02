import { ArrowLeft, Clock, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { formatNumber } from '@/lib/format';
import { SERVICE_TILES } from '@/lib/mock/services';
import {
  getProviderById,
  offeringLabelKey,
  priceFromEgp,
  type ProviderOffering,
} from '@/lib/mock/serviceProviders';
import { useShowServiceDurations } from '@/stores/featureTogglesStore';

export function ServiceProvider() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const showServiceDurations = useShowServiceDurations();
  const { tileId = '', providerId = '' } = useParams<{
    tileId: string;
    providerId: string;
  }>();

  const tile = SERVICE_TILES.find((tl) => tl.id === tileId);
  const provider = getProviderById(providerId);
  if (!tile || !provider) return <Navigate to={`/services/${tileId || ''}`} replace />;

  const goBook = (offering: ProviderOffering) =>
    navigate(`/services/${tile.id}/book?providerId=${provider.id}&offering=${offering.key}`);

  return (
    <>
      <div className="bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-700">
        <div className="flex flex-row items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(`/services/${tile.id}`)}
            aria-label="Back"
            className="p-2 -ms-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700"
          >
            <ArrowLeft size={22} className="text-ink-700 dark:text-white rtl:rotate-180" />
          </button>
          <h1 className="text-base font-bold text-ink-900 dark:text-white truncate">
            {provider.name}
          </h1>
        </div>

        <div className="flex flex-row items-start gap-3 px-4 pb-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br from-brand-400 to-accent text-white font-bold flex-shrink-0">
            {provider.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-row items-center gap-2">
              <p className="text-base font-bold text-ink-900 dark:text-white truncate">
                {provider.name}
              </p>
              {provider.badgeKey && (
                <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0">
                  {t(provider.badgeKey)}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-row flex-wrap items-center gap-x-3 text-[11px] text-ink-500 dark:text-ink-100">
              <span className="inline-flex items-center gap-1">
                <Star size={11} />
                {t('services.providers.rating', { rating: provider.rating.toFixed(1) })} ·{' '}
                {t('services.providers.reviews', {
                  n: formatNumber(provider.reviewsCount, i18n.language),
                })}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock size={11} />
                {t('services.providers.responseTime', { min: provider.responseTimeMin })}
              </span>
            </div>
            <div className="mt-1 flex flex-row gap-1">
              {provider.languages.map((lng) => (
                <span
                  key={lng}
                  className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase bg-ink-100 dark:bg-ink-900 text-ink-500"
                >
                  {lng}
                </span>
              ))}
            </div>
            <p className="mt-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
              {t('services.providers.priceFrom', {
                price: formatNumber(priceFromEgp(provider), i18n.language),
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Offerings */}
      <div className="p-4 space-y-3">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
          {t('services.providers.offeringsTitle')}
        </h3>
        <div className="space-y-2">
          {provider.offerings.map((o) => (
            <div
              key={o.key}
              className="flex flex-row items-center bg-white dark:bg-ink-700 rounded-2xl p-3 border border-ink-100 dark:border-ink-700"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink-900 dark:text-white truncate">
                  {t(offeringLabelKey(tile.id, o.key))}
                </p>
                <p className="text-[11px] text-ink-500 dark:text-ink-100">
                  {showServiceDurations && (
                    <>
                      {t('services.providers.offeringDuration', { min: o.durationMin })}
                      {' · '}
                    </>
                  )}
                  EGP {formatNumber(o.priceEgp, i18n.language)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => goBook(o)}
                className="ms-3 bg-brand-500 text-white rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              >
                {t('services.providers.requestService')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
