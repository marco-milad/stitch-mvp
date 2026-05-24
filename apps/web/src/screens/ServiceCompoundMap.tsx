import { ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { CompoundMapViewport } from '@/components/map/CompoundMapViewport';
import { HotspotFilterChips, type FilterKey } from '@/components/map/HotspotFilterChips';
import { HotspotDrawer } from '@/components/map/HotspotDrawer';
import { CATEGORY_ORDER, MAP_HOTSPOTS, type HotspotCategory } from '@/lib/mock/compoundMap';

export function ServiceCompoundMap() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Computed each render — small set, no need to memo.
  const visibleCategories: ReadonlySet<HotspotCategory> =
    filter === 'all' ? new Set(CATEGORY_ORDER) : new Set([filter]);

  const selectedHotspot = useMemo(
    () => MAP_HOTSPOTS.find((h) => h.id === selectedId) ?? null,
    [selectedId],
  );

  return (
    <div className="flex-1 flex flex-col bg-ink-50 dark:bg-ink-900">
      {/* Header */}
      <div className="bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-700">
        <div className="flex flex-row items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/services')}
            aria-label={t('services.compoundMap.back')}
            className="p-2 -ms-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700"
          >
            <ArrowLeft size={22} className="text-ink-700 dark:text-white rtl:rotate-180" />
          </button>
          <h1 className="text-base font-bold text-ink-900 dark:text-white truncate">
            {t('services.compoundMap.title')}
          </h1>
        </div>
      </div>

      {/* Filter chips */}
      <HotspotFilterChips value={filter} onChange={setFilter} />

      {/* Map */}
      <CompoundMapViewport
        hotspots={MAP_HOTSPOTS}
        visibleCategories={visibleCategories}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {/* Drawer (permanently mounted; slide-up controlled by hotspot != null) */}
      <HotspotDrawer hotspot={selectedHotspot} onClose={() => setSelectedId(null)} />
    </div>
  );
}
