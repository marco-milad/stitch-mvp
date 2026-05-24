import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { UnsplashImage } from '@/components/ui/UnsplashImage';
import { TOUR_STOPS, type Hotspot, type TourStop } from '@/lib/mock/discover';
import { useDiscoverStore } from '@/stores/discoverStore';

/**
 * Virtual tour shell — Week 2 deliverable.
 * Stage is a gradient placeholder for now; swaps for a real 360° panorama
 * (Pannellum/Marzipano) or per-stop video once the asset pipeline lands.
 */
export function DiscoverTour() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentTourStopIndex, setTourStopIndex, selectedHotspotId, selectHotspot, resetTour } =
    useDiscoverStore();

  const stop = TOUR_STOPS[currentTourStopIndex] ?? TOUR_STOPS[0];
  const total = TOUR_STOPS.length;
  const activeHotspot = stop.hotspots.find((h) => h.id === selectedHotspotId) ?? null;

  const goPrev = () => setTourStopIndex(Math.max(0, currentTourStopIndex - 1));
  const goNext = () => setTourStopIndex(Math.min(total - 1, currentTourStopIndex + 1));

  const close = () => {
    resetTour();
    navigate('/discover');
  };

  // ESC closes the modal — standard expectation for fullscreen overlays.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedHotspotId) selectHotspot(null);
        else close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // close/selectHotspot are stable; intentional minimal deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHotspotId]);

  return (
    <div className="flex-1 flex flex-col bg-ink-900 text-white">
      {/* Header */}
      <div className="flex flex-row items-center justify-between px-4 py-3 border-b border-white/10">
        <button
          type="button"
          onClick={close}
          aria-label={t('discover.tour.close')}
          className="p-2 -ms-2 rounded-lg hover:bg-white/10"
        >
          <X size={22} />
        </button>
        <p className="text-sm font-semibold tabular-nums">
          {t('discover.tour.stopCounter', { current: currentTourStopIndex + 1, total })}
        </p>
        <div className="w-9" aria-hidden />
      </div>

      {/* Stage */}
      <Stage stop={stop} onHotspotSelect={selectHotspot} />

      {/* Hotspot detail panel — appears only when a hotspot is open */}
      {activeHotspot && (
        <HotspotPanel hotspot={activeHotspot} onClose={() => selectHotspot(null)} />
      )}

      {/* Bottom controls */}
      <div className="bg-ink-900 border-t border-white/10 px-4 pt-3 pb-4">
        <ThumbnailStrip
          stops={TOUR_STOPS}
          activeIndex={currentTourStopIndex}
          onSelect={setTourStopIndex}
        />
        <div className="flex flex-row gap-2 mt-3">
          <NavButton
            label={t('discover.tour.prev')}
            disabled={currentTourStopIndex === 0}
            onClick={goPrev}
            direction="prev"
          />
          <NavButton
            label={t('discover.tour.next')}
            disabled={currentTourStopIndex === total - 1}
            onClick={goNext}
            direction="next"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Stage ───────────────────────────────────────────────────────────────────

function Stage({
  stop,
  onHotspotSelect,
}: {
  stop: TourStop;
  onHotspotSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { icon: Icon } = stop;
  // Inline gradient on a plain absolutely-positioned div. The previous
  // <Gradient className="absolute inset-0"> wrapper was collapsing to 0×0
  // because the wrapper's inline `position: relative` won over the Tailwind
  // `absolute` utility, leaving the photo + children with no parent to fill.
  const stageGradientCss = `linear-gradient(135deg, ${stop.stageGradient.from}, ${stop.stageGradient.to})`;
  return (
    <div className="flex-1 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden" style={{ background: stageGradientCss }}>
        {/* Premium photo — falls back to the stop's brand gradient if it fails. */}
        <UnsplashImage
          src={stop.imageUrl}
          alt={t(stop.titleKey)}
          fill
          loading="eager"
          overlayClassName="bg-gradient-to-t from-black/55 to-transparent"
        />

        {/* Title badge — anchored to the bottom-start so the photo gets center stage */}
        <div className="absolute bottom-10 inset-x-4 text-white/95">
          <div className="inline-flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 backdrop-blur ring-1 ring-white/30">
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-base font-extrabold leading-tight truncate">{t(stop.titleKey)}</p>
              <p className="text-[11px] text-white/75 truncate">{t(stop.subKey)}</p>
            </div>
          </div>
        </div>

        {/* Hotspot dots — physical left/top so they pin to image positions
            in both LTR and RTL (the image itself doesn't mirror) */}
        {stop.hotspots.map((h) => (
          <HotspotDot key={h.id} hotspot={h} onClick={() => onHotspotSelect(h.id)} />
        ))}

        {/* Hint */}
        <p className="absolute bottom-3 inset-x-0 text-center text-[11px] text-white/70">
          {t('discover.tour.tapHint')}
        </p>
      </div>
    </div>
  );
}

function HotspotDot({ hotspot, onClick }: { hotspot: Hotspot; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={hotspot.id}
      className="absolute -translate-x-1/2 -translate-y-1/2 group"
      style={{ left: `${hotspot.x * 100}%`, top: `${hotspot.y * 100}%` }}
    >
      <span className="absolute inset-0 m-auto w-6 h-6 rounded-full bg-white/50 animate-ping" />
      <span className="relative block w-6 h-6 rounded-full bg-white border-2 border-brand-500 shadow-lg group-hover:scale-110 transition-transform" />
    </button>
  );
}

// ─── Hotspot panel ──────────────────────────────────────────────────────────

function HotspotPanel({ hotspot, onClose }: { hotspot: Hotspot; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      role="dialog"
      aria-label={t(hotspot.titleKey)}
      className="bg-white text-ink-900 dark:bg-ink-700 dark:text-white px-4 py-3 border-t border-ink-100 dark:border-ink-700"
    >
      <div className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-600 mb-0.5">
            {t('discover.tour.hotspotsTitle')}
          </p>
          <p className="text-base font-bold leading-tight">{t(hotspot.titleKey)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('discover.tour.close')}
          className="-me-2 -mt-1 p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-900 text-ink-500"
        >
          <X size={18} />
        </button>
      </div>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-100">{t(hotspot.descKey)}</p>
    </div>
  );
}

// ─── Bottom controls ────────────────────────────────────────────────────────

function ThumbnailStrip({
  stops,
  activeIndex,
  onSelect,
}: {
  stops: TourStop[];
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-row gap-2 overflow-x-auto -mx-1 px-1 snap-x">
      {stops.map((stop, i) => {
        const active = i === activeIndex;
        const { icon: Icon } = stop;
        return (
          <button
            key={stop.id}
            type="button"
            onClick={() => onSelect(i)}
            aria-current={active}
            className={[
              'snap-start flex-shrink-0 w-20 rounded-xl p-2 text-start transition-all',
              active ? 'bg-brand-500 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20',
            ].join(' ')}
          >
            <Icon size={16} />
            <p className="mt-1 text-[10px] font-semibold truncate">{t(stop.titleKey)}</p>
          </button>
        );
      })}
    </div>
  );
}

function NavButton({
  label,
  onClick,
  disabled,
  direction,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  direction: 'prev' | 'next';
}) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex-1 flex flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-colors',
        disabled
          ? 'bg-white/5 text-white/30 cursor-not-allowed'
          : 'bg-white text-ink-900 hover:bg-white/90',
      ].join(' ')}
    >
      {direction === 'prev' && <Icon size={18} className="rtl:rotate-180" />}
      <span>{label}</span>
      {direction === 'next' && <Icon size={18} className="rtl:rotate-180" />}
    </button>
  );
}
