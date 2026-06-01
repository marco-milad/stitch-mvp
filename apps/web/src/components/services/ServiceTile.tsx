import { Star } from 'lucide-react';
import { memo, useState } from 'react';

import { useTilt } from '@/components/ui/useTilt';
import { TONE_BG, TONE_FG, type ServiceTile as ServiceTileData } from '@/lib/mock/services';
import { useServicesStore } from '@/stores/servicesStore';

interface Props {
  tile: ServiceTileData;
  /** When set, the tile's name highlights this substring. */
  highlight?: string;
  onClick: () => void;
}

function highlightedSegments(text: string, query: string): Array<{ text: string; match: boolean }> {
  if (!query) return [{ text, match: false }];
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx < 0) return [{ text, match: false }];
  return [
    { text: text.slice(0, idx), match: false },
    { text: text.slice(idx, idx + query.length), match: true },
    { text: text.slice(idx + query.length), match: false },
  ];
}

function ServiceTileImpl({ tile, highlight, onClick }: Props) {
  const fav = useServicesStore((s) => s.favorites.has(tile.id));
  const toggleFavorite = useServicesStore((s) => s.toggleFavorite);
  const [pop, setPop] = useState(false);
  const tilt = useTilt<HTMLButtonElement>();

  const onFavClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPop(true);
    toggleFavorite(tile.id);
    setTimeout(() => setPop(false), 220);
  };

  const segments = highlightedSegments(tile.name, highlight ?? '');
  const Icon = tile.icon;
  const bg = TONE_BG[tile.tone];
  const fg = TONE_FG[tile.tone];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={tile.name}
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className="group relative flex-1 m-1.5 bg-white/65 dark:bg-ink-700/65 backdrop-blur-md rounded-2xl p-3 border border-white/40 dark:border-white/10 shadow-lg shadow-ink-900/5 text-left tilt-surface overflow-hidden hover:shadow-xl hover:shadow-ink-900/10 active:scale-[0.98] transition-all duration-300 ease-smooth"
      style={{ ...tilt.style, minHeight: 130 }}
    >
      {/* Cursor-tracking specular highlight */}
      <span
        aria-hidden
        className="absolute inset-0 tilt-sheen opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />
      {/* Favorite star (top-right) */}
      <button
        type="button"
        onClick={onFavClick}
        aria-label={fav ? 'Remove favorite' : 'Add favorite'}
        className="absolute top-2 right-2 p-1 transition-transform"
        style={{ transform: pop ? 'scale(1.3)' : 'scale(1)' }}
      >
        <Star
          color={fav ? '#F59E0B' : '#CBD5E1'}
          fill={fav ? '#F59E0B' : 'transparent'}
          size={18}
        />
      </button>

      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: bg }}
      >
        <Icon color={fg} size={20} />
      </div>

      <p className="text-sm font-semibold text-ink-900 dark:text-white mb-0.5 truncate">
        {segments.map((seg, i) =>
          seg.match ? (
            <span key={i} style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
              {seg.text}
            </span>
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
      </p>
      <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">{tile.sub}</p>
    </button>
  );
}

export const ServiceTile = memo(ServiceTileImpl);
