import { useTranslation } from 'react-i18next';

import { HOTSPOT_TONE, type HotspotCategory, type MapHotspot } from '@/lib/mock/compoundMap';

interface Props {
  hotspots: ReadonlyArray<MapHotspot>;
  visibleCategories: ReadonlySet<HotspotCategory>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Stylized brochure-feel compound map. Pure SVG backdrop (compound outline,
 * decorative roads, park, lake, faint zone labels) with HTML hotspot
 * buttons absolutely positioned in container percentages on top.
 *
 * `preserveAspectRatio="none"` lets the SVG stretch to fill the container
 * so hotspot percent-coords always align with the backdrop, matching the
 * pattern used by DiscoverTour + DiscoverMasterPlan.
 */
export function CompoundMapViewport({ hotspots, visibleCategories, selectedId, onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <div
      className="flex-1 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #FDF6E8 0%, #F5EBD6 50%, #EFE0C6 100%)',
      }}
    >
      {/* Stylized brochure backdrop */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {/* Compound outline — rounded organic polygon */}
        <path
          d="M6,14 Q6,6 14,6 H86 Q94,6 94,14 V86 Q94,94 86,94 H14 Q6,94 6,86 Z"
          fill="#FBF4E2"
          stroke="#C9A876"
          strokeWidth="0.5"
        />

        {/* Central park polygon */}
        <ellipse cx="52" cy="55" rx="22" ry="14" fill="#A7D8A8" opacity="0.45" />

        {/* Lake */}
        <ellipse cx="56" cy="58" rx="7" ry="4.5" fill="#7BC4D8" opacity="0.7" />

        {/* Main roads — dashed crosshair */}
        <path
          d="M50,6 V94"
          stroke="#FFFFFF"
          strokeWidth="0.6"
          strokeDasharray="2 1.2"
          opacity="0.55"
        />
        <path
          d="M6,50 H94"
          stroke="#FFFFFF"
          strokeWidth="0.6"
          strokeDasharray="2 1.2"
          opacity="0.55"
        />

        {/* Curving inner road */}
        <path
          d="M14,22 Q34,38 50,50 T86,82"
          stroke="#FFFFFF"
          strokeWidth="0.45"
          strokeDasharray="1.4 1.4"
          opacity="0.4"
          fill="none"
        />
        <path
          d="M18,82 Q34,62 50,50 T82,16"
          stroke="#FFFFFF"
          strokeWidth="0.45"
          strokeDasharray="1.4 1.4"
          opacity="0.4"
          fill="none"
        />

        {/* Zone labels — subtle */}
        <text
          x="20"
          y="20"
          fontSize="2.8"
          fontWeight="700"
          fill="#8B6F47"
          opacity="0.5"
          textAnchor="middle"
        >
          {t('services.compoundMap.zoneLabels.villas')}
        </text>
        <text
          x="20"
          y="82"
          fontSize="2.8"
          fontWeight="700"
          fill="#8B6F47"
          opacity="0.5"
          textAnchor="middle"
        >
          {t('services.compoundMap.zoneLabels.apartments')}
        </text>
        <text
          x="80"
          y="20"
          fontSize="2.8"
          fontWeight="700"
          fill="#8B6F47"
          opacity="0.5"
          textAnchor="middle"
        >
          {t('services.compoundMap.zoneLabels.outlets')}
        </text>
        <text
          x="80"
          y="88"
          fontSize="2.6"
          fontWeight="700"
          fill="#8B6F47"
          opacity="0.45"
          textAnchor="middle"
        >
          {t('services.compoundMap.zoneLabels.future')}
        </text>
      </svg>

      {/* Hotspot dots — physical left/top so they don't mirror in RTL
          (the underlying SVG is the same image regardless of language) */}
      {hotspots.map((h) => {
        const visible = visibleCategories.has(h.category);
        return (
          <HotspotDot
            key={h.id}
            hotspot={h}
            visible={visible}
            selected={selectedId === h.id}
            onClick={() => onSelect(h.id)}
          />
        );
      })}

      {/* Tap hint */}
      <p className="absolute bottom-3 inset-x-0 text-center text-[11px] text-ink-500/80 pointer-events-none">
        {t('services.compoundMap.tapHint')}
      </p>
    </div>
  );
}

function HotspotDot({
  hotspot,
  visible,
  selected,
  onClick,
}: {
  hotspot: MapHotspot;
  visible: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const tone = HOTSPOT_TONE[hotspot.category];
  const Icon = hotspot.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t(hotspot.nameKey)}
      aria-pressed={selected ? 'true' : 'false'}
      className={[
        'absolute -translate-x-1/2 -translate-y-1/2 group transition-opacity',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      ].join(' ')}
      style={{ left: `${hotspot.x * 100}%`, top: `${hotspot.y * 100}%` }}
    >
      {selected && (
        <span
          className="absolute inset-0 m-auto w-10 h-10 rounded-full animate-ping opacity-60"
          style={{ backgroundColor: tone.dot }}
        />
      )}
      <span
        className={[
          'relative w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg ring-2 ring-white group-hover:scale-110 transition-transform',
          selected ? 'scale-110' : '',
        ].join(' ')}
        style={{ backgroundColor: tone.dot }}
      >
        <Icon size={16} />
      </span>
    </button>
  );
}
