import { ArrowLeft, Clock, Star, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { formatNumber } from '@/lib/format';
import { SERVICE_TILES, TONE_BG, TONE_FG, type ServiceTile } from '@/lib/mock/services';
import {
  getProvidersForTile,
  priceFromEgp,
  type ServiceProvider,
} from '@/lib/mock/serviceProviders';

type SortKey = 'topRated' | 'fastest' | 'cheapest';
const SORTS: SortKey[] = ['topRated', 'fastest', 'cheapest'];

export function ServiceCategory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tileId = '' } = useParams<{ tileId: string }>();
  const [sort, setSort] = useState<SortKey>('topRated');

  const tile = SERVICE_TILES.find((t) => t.id === tileId);
  if (!tile) return <Navigate to="/services" replace />;

  const providers = useMemo(() => {
    const list = getProvidersForTile(tileId);
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'topRated':
          return b.rating - a.rating;
        case 'fastest':
          return a.responseTimeMin - b.responseTimeMin;
        case 'cheapest':
          return priceFromEgp(a) - priceFromEgp(b);
      }
    });
  }, [tileId, sort]);

  return (
    <>
      <CategoryHeader tile={tile} onBack={() => navigate('/services')} />

      {tile.bookable ? (
        <div className="p-4 space-y-3">
          <SortChips value={sort} onChange={setSort} />
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-400 pt-2">
            {t('services.category.providersTitle')}
          </h3>
          {providers.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-ink-100">{t('services.category.empty')}</p>
          ) : (
            <div className="space-y-2">
              {providers.map((p) => (
                <ProviderRow
                  key={p.id}
                  provider={p}
                  onClick={() => navigate(`/services/${tile.id}/providers/${p.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="p-4">
          <div className="bg-white dark:bg-ink-700 rounded-2xl p-4 border border-ink-100 dark:border-ink-700">
            <p className="text-sm text-ink-700 dark:text-ink-100">
              {t('services.category.infoOnly')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/services')}
              className="mt-4 w-full bg-brand-500 rounded-xl py-2.5 text-white text-sm font-semibold"
            >
              {t('services.category.infoAction')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function CategoryHeader({ tile, onBack }: { tile: ServiceTile; onBack: () => void }) {
  const { t } = useTranslation();
  const TileIcon = tile.icon;
  return (
    <div className="bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-700">
      <div className="flex flex-row items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="p-2 -ms-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700"
        >
          <ArrowLeft size={22} className="text-ink-700 dark:text-white rtl:rotate-180" />
        </button>
        <h1 className="text-base font-bold text-ink-900 dark:text-white truncate">{tile.name}</h1>
      </div>
      <div className="flex flex-row items-center gap-3 px-4 pb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: TONE_BG[tile.tone] }}
        >
          <TileIcon size={24} color={TONE_FG[tile.tone]} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink-900 dark:text-white truncate">{tile.name}</p>
          <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">{tile.sub}</p>
        </div>
      </div>
    </div>
  );
}

function SortChips({ value, onChange }: { value: SortKey; onChange: (s: SortKey) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-row gap-2 overflow-x-auto -mx-1 px-1">
      {SORTS.map((s) => {
        const active = s === value;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            aria-pressed={active ? 'true' : 'false'}
            className={[
              'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
              active
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white dark:bg-ink-700 text-ink-700 dark:text-white border-ink-100 dark:border-ink-700',
            ].join(' ')}
          >
            {t(`services.category.filters.${s}`)}
          </button>
        );
      })}
    </div>
  );
}

function ProviderRow({ provider, onClick }: { provider: ServiceProvider; onClick: () => void }) {
  const { t, i18n } = useTranslation();
  const price = priceFromEgp(provider);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex flex-row items-start gap-3 bg-white dark:bg-ink-700 rounded-2xl p-3 border border-ink-100 dark:border-ink-700 text-start hover:border-brand-400 transition-colors"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-brand-400 to-accent text-white font-bold text-sm flex-shrink-0">
        {provider.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-row items-center gap-2">
          <p className="text-sm font-bold text-ink-900 dark:text-white truncate">{provider.name}</p>
          {provider.badgeKey && (
            <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0">
              {t(provider.badgeKey)}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-row flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-500 dark:text-ink-100">
          <Meta Icon={Star}>
            {t('services.providers.rating', { rating: provider.rating.toFixed(1) })} ·{' '}
            {t('services.providers.reviews', {
              n: formatNumber(provider.reviewsCount, i18n.language),
            })}
          </Meta>
          <Meta Icon={Clock}>
            {t('services.providers.responseTime', { min: provider.responseTimeMin })}
          </Meta>
        </div>
        <p className="mt-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
          {t('services.providers.priceFrom', {
            price: formatNumber(price, i18n.language),
          })}
        </p>
      </div>
    </button>
  );
}

function Meta({ Icon, children }: { Icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon size={11} />
      <span>{children}</span>
    </span>
  );
}
