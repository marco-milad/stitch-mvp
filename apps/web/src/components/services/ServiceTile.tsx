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
  // Tilt is applied to the outer wrapper so the whole tile (including
  // the absolutely-positioned favorite star) parallaxes together.
  const tilt = useTilt<HTMLDivElement>();

  const onFavClick = (e: React.MouseEvent) => {
    // Stop the click from bubbling up to the wrapper — the favorite
    // star sits ABOVE the tile button visually but is a DOM sibling,
    // so without stopPropagation the parent click would still fire.
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
    // Wrapper div — non-interactive container that hosts two SIBLINGS:
    // the tile button + the favorite star button. Keeping them as
    // siblings (not nested) satisfies the HTML5 spec rule that
    // interactive content can't contain interactive content, and the
    // matching jsx-a11y/no-nested-interactive rule.
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className="group relative flex-1 m-1.5 tilt-surface"
      style={tilt.style}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={tile.name}
        className="block w-full text-left bg-white dark:bg-ink-700 rounded-3xl p-4 border border-sand-200/60 dark:border-ink-700 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-base ease-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-950"
        style={{ minHeight: 132 }}
      >
        {/* Cursor-tracking specular highlight */}
        <span
          aria-hidden
          className="absolute inset-0 tilt-sheen opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        />
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
          style={{ backgroundColor: bg }}
        >
          <Icon color={fg} size={20} />
        </div>
        <p className="text-body-md font-bold text-ink-950 dark:text-white mb-0.5 truncate">
          {segments.map((seg, i) =>
            seg.match ? (
              <span key={i} className="bg-accent-300 text-ink-950 rounded px-0.5">
                {seg.text}
              </span>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </p>
        <p className="text-label-sm normal-case tracking-normal font-normal text-ink-500 dark:text-ink-100 truncate">
          {tile.sub}
        </p>
      </button>
      {/* Favorite star — sibling button, absolutely positioned over the
          top-right corner of the tile. */}
      <button
        type="button"
        onClick={onFavClick}
        aria-label={fav ? 'Remove favorite' : 'Add favorite'}
        aria-pressed={fav}
        className="absolute top-2 right-2 p-1 transition-transform z-10"
        style={{ transform: pop ? 'scale(1.3)' : 'scale(1)' }}
      >
        <Star
          color={fav ? '#F59E0B' : '#CBD5E1'}
          fill={fav ? '#F59E0B' : 'transparent'}
          size={18}
        />
      </button>
    </div>
  );
}

export const ServiceTile = memo(ServiceTileImpl);
