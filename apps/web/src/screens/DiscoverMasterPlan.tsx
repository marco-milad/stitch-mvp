import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { InlineNotice, type InlineNoticeData } from '@/components/ui/InlineNotice';
import { UnsplashImage } from '@/components/ui/UnsplashImage';
import {
  COMPOUND,
  KIND_COLOR,
  KIND_IMAGE,
  KIND_LABEL_KEY,
  MASTER_PLAN_ZONES,
  type MasterPlanZone,
  type ZoneKind,
} from '@/lib/mock/discover';
import { useDiscoverStore } from '@/stores/discoverStore';

const KIND_ORDER: ZoneKind[] = ['residential', 'amenity', 'commercial', 'future'];
type Filter = 'all' | ZoneKind;

/**
 * Master-plan modal — Week 2 deliverable.
 * Stage is a gradient placeholder; swaps for the real master-plan SVG/image
 * once the asset pipeline lands. Zones come from MASTER_PLAN_ZONES with
 * normalized cx/cy coords.
 */
export function DiscoverMasterPlan() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selectedZoneId, selectZone } = useDiscoverStore();
  const [filter, setFilter] = useState<Filter>('all');

  const visibleZones =
    filter === 'all' ? MASTER_PLAN_ZONES : MASTER_PLAN_ZONES.filter((z) => z.kind === filter);
  const activeZone = MASTER_PLAN_ZONES.find((z) => z.id === selectedZoneId) ?? null;

  const close = () => {
    selectZone(null);
    navigate('/discover');
  };

  // ESC: dismiss zone panel first, then close the modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selectedZoneId) selectZone(null);
      else close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZoneId]);

  return (
    <div className="flex-1 flex flex-col bg-ink-900 text-white">
      {/* Header */}
      <div className="flex flex-row items-center justify-between px-4 py-3 border-b border-white/10">
        <button
          type="button"
          onClick={close}
          aria-label={t('discover.masterPlan.close')}
          className="p-2 -ms-2 rounded-lg hover:bg-white/10"
        >
          <X size={22} />
        </button>
        <p className="text-sm font-semibold">{t('discover.masterPlan.title')}</p>
        <div className="w-9" aria-hidden />
      </div>

      {/* Filter chips */}
      <FilterChips value={filter} onChange={setFilter} />

      {/* Stage — photo background swaps to the active zone's kind image,
          falling back to the compound hero when no zone is selected. */}
      <Stage
        zones={visibleZones}
        onZoneSelect={selectZone}
        stageImage={(activeZone && KIND_IMAGE[activeZone.kind]) ?? COMPOUND.heroImageUrl}
        stageAlt={activeZone ? t(KIND_LABEL_KEY[activeZone.kind]) : COMPOUND.name}
      />

      {/* Zone detail panel */}
      {activeZone && <ZonePanel zone={activeZone} onClose={() => selectZone(null)} />}

      {/* Legend */}
      <Legend />
    </div>
  );
}

// ─── Filter chips ────────────────────────────────────────────────────────────

function FilterChips({ value, onChange }: { value: Filter; onChange: (v: Filter) => void }) {
  const { t } = useTranslation();
  const chips: Array<{ key: Filter; labelKey: string }> = [
    { key: 'all', labelKey: 'discover.masterPlan.kinds.all' },
    ...KIND_ORDER.map((k) => ({ key: k as Filter, labelKey: KIND_LABEL_KEY[k] })),
  ];
  return (
    <div className="flex flex-row gap-2 overflow-x-auto px-4 py-3 border-b border-white/10">
      {chips.map((chip) => {
        const active = chip.key === value;
        const tone = chip.key === 'all' ? null : KIND_COLOR[chip.key];
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => onChange(chip.key)}
            aria-pressed={active ? 'true' : 'false'}
            className={[
              'flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
              active
                ? 'bg-white text-ink-900 border-white'
                : 'bg-white/5 text-white/80 border-white/15 hover:bg-white/10',
            ].join(' ')}
          >
            {tone && (
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: tone.dot }}
              />
            )}
            {t(chip.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

// ─── Stage ───────────────────────────────────────────────────────────────────

function Stage({
  zones,
  onZoneSelect,
  stageImage,
  stageAlt,
}: {
  zones: MasterPlanZone[];
  onZoneSelect: (id: string) => void;
  stageImage: string;
  stageAlt: string;
}) {
  const { t } = useTranslation();
  // Plain absolutely-positioned div instead of <Gradient ...>. The previous
  // wrapper's inline `position: relative` won over the Tailwind `absolute`
  // utility, collapsing it to 0×0 and hiding the photo + dots.
  return (
    <div className="flex-1 relative overflow-hidden">
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0F172A, #0E7490)' }}
      >
        {/* Photo backdrop — switches as the user selects a zone; brand
            gradient remains the fallback if the image fails to load. */}
        <UnsplashImage
          src={stageImage}
          alt={stageAlt}
          fill
          loading="eager"
          overlayClassName="bg-gradient-to-t from-black/60 via-black/30 to-black/40"
        />

        {/* Faint decorative path overlay — adds a brochure-map feel without
            obscuring the photo. Lower opacity than the no-photo version. */}
        <svg
          className="absolute inset-0 w-full h-full opacity-15 pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M10 80 Q 30 20, 50 50 T 90 30"
            stroke="white"
            strokeWidth="0.4"
            fill="none"
            strokeDasharray="2 2"
          />
          <path
            d="M5 50 Q 50 90, 95 60"
            stroke="white"
            strokeWidth="0.4"
            fill="none"
            strokeDasharray="2 2"
          />
        </svg>

        {/* Zone dots — physical left/top so they pin to image coords in LTR + RTL */}
        {zones.map((z) => (
          <ZoneDot key={z.id} zone={z} onClick={() => onZoneSelect(z.id)} />
        ))}

        {/* Hint */}
        <p className="absolute bottom-3 inset-x-0 text-center text-[11px] text-white/80">
          {t('discover.masterPlan.tapHint')}
        </p>
      </div>
    </div>
  );
}

function ZoneDot({ zone, onClick }: { zone: MasterPlanZone; onClick: () => void }) {
  const { t } = useTranslation();
  const tone = KIND_COLOR[zone.kind];
  const { icon: Icon } = zone;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t(zone.titleKey)}
      className="absolute -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center"
      style={{ left: `${zone.cx * 100}%`, top: `${zone.cy * 100}%` }}
    >
      <span
        className="absolute inset-0 m-auto w-9 h-9 rounded-full animate-ping opacity-50"
        style={{ backgroundColor: tone.dot }}
      />
      <span
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg ring-2 ring-white/80 group-hover:scale-110 transition-transform"
        style={{ backgroundColor: tone.dot }}
      >
        <Icon size={16} />
      </span>
    </button>
  );
}

// ─── Zone panel ──────────────────────────────────────────────────────────────

function ZonePanel({ zone, onClose }: { zone: MasterPlanZone; onClose: () => void }) {
  const { t } = useTranslation();
  const tone = KIND_COLOR[zone.kind];
  const kindImage = KIND_IMAGE[zone.kind];
  const [notice, setNotice] = useState<InlineNoticeData | null>(null);

  // Auto-dismiss the "coming soon" notice after a beat so the resident
  // can re-tap and see it re-confirm. 3 s matches the brand's notice
  // dwell convention.
  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(id);
  }, [notice]);

  // Reset the notice when the open zone changes — otherwise the
  // previous zone's stale message would carry over into the new panel.
  useEffect(() => {
    setNotice(null);
  }, [zone.id]);

  return (
    <div
      role="dialog"
      aria-label={t(zone.titleKey)}
      className="bg-white text-ink-900 dark:bg-ink-700 dark:text-white border-t border-ink-100 dark:border-ink-700 overflow-hidden"
    >
      {/* Kind banner — premium photo for residential/amenity/commercial; future zones get no banner. */}
      {kindImage && (
        <div className="relative h-24">
          <UnsplashImage
            src={kindImage}
            alt={t(KIND_LABEL_KEY[zone.kind])}
            fill
            loading="eager"
            overlayClassName="bg-gradient-to-t from-black/40 to-transparent"
          />
        </div>
      )}
      <div className="px-4 py-3">
        <div className="flex flex-row items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ backgroundColor: tone.chip, color: tone.ring }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: tone.dot }}
              />
              {t(KIND_LABEL_KEY[zone.kind])}
            </span>
            <p className="text-base font-bold leading-tight">{t(zone.titleKey)}</p>
            <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-100">{t(zone.subKey)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('discover.masterPlan.close')}
            className="-me-2 -mt-1 p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-900 text-ink-500"
          >
            <X size={18} />
          </button>
        </div>
        <button
          type="button"
          onClick={() =>
            setNotice({
              tone: 'info',
              message: t('discover.masterPlan.comingSoonTitle'),
              detail: t('discover.masterPlan.comingSoon'),
            })
          }
          className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: tone.dot }}
        >
          {t('discover.masterPlan.exploreZone')}
        </button>
        {/* InlineNotice replaces the old window.alert. The component's
            AnimatePresence handles the slide-in / fade-out, so the
            empty state below it stays out of the way when there's no
            notice on screen. */}
        <div className="mt-3">
          <InlineNotice notice={notice} onDismiss={() => setNotice(null)} />
        </div>
      </div>
    </div>
  );
}

// ─── Legend ─────────────────────────────────────────────────────────────────

function Legend() {
  const { t } = useTranslation();
  return (
    <div className="bg-ink-900 border-t border-white/10 px-4 pt-3 pb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">
        {t('discover.masterPlan.legendTitle')}
      </p>
      <div className="flex flex-row flex-wrap gap-x-4 gap-y-2">
        {KIND_ORDER.map((k) => (
          <div key={k} className="flex flex-row items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: KIND_COLOR[k].dot }}
            />
            <span className="text-xs text-white/85">{t(KIND_LABEL_KEY[k])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
