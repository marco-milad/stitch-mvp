import { ChevronRight, Search, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { SearchBar } from '@/components/services/SearchBar';
import { ServiceTile } from '@/components/services/ServiceTile';
import { TopBar } from '@/components/TopBar';
import { useUnreadCount } from '@/lib/useNotifications';
import {
  SERVICE_SECTIONS,
  SERVICE_TILES,
  searchCorpus,
  type ServiceSectionKey,
  type ServiceTile as Tile,
} from '@/lib/mock/services';
import { useServicesStore } from '@/stores/servicesStore';

// Mocking the current resident as an Owner so owner-only tiles show by default.
const IS_OWNER = true;

function TileGrid({
  tiles,
  query,
  onTileClick,
}: {
  tiles: Tile[];
  query: string;
  onTileClick: (tile: Tile) => void;
}) {
  const rows: Tile[][] = [];
  for (let i = 0; i < tiles.length; i += 2) {
    rows.push(tiles.slice(i, i + 2));
  }
  return (
    <div className="px-2.5">
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="flex flex-row">
          {row.map((tile) => (
            <ServiceTile
              key={tile.id}
              tile={tile}
              highlight={query}
              onClick={() => onTileClick(tile)}
            />
          ))}
          {row.length === 1 && <div className="flex-1 m-1.5" />}
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  // Brand identity: section headers land on heading-lg ink-950 — restraint
  // over the old uppercase tracker. The hierarchy reads like a magazine
  // spread, not a system console.
  return <h3 className="px-4 pt-5 pb-2 text-heading-lg text-ink-950 dark:text-white">{label}</h3>;
}

export function Services() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const favorites = useServicesStore((s) => s.favorites);
  const unreadCount = useUnreadCount();
  const q = query.trim().toLowerCase();

  const visibleTiles = useMemo(
    () => SERVICE_TILES.filter((tile) => IS_OWNER || !tile.ownerOnly),
    [],
  );

  const filteredTiles = useMemo(() => {
    if (!q) return visibleTiles;
    return visibleTiles.filter((tile) => searchCorpus(tile).includes(q));
  }, [q, visibleTiles]);

  const tilesBySection = useMemo(() => {
    const map: Record<ServiceSectionKey, Tile[]> = {
      daily: [],
      compound: [],
      property: [],
      sales: [],
    };
    for (const tile of filteredTiles) map[tile.section].push(tile);
    return map;
  }, [filteredTiles]);

  const favoriteTiles = useMemo(
    () => visibleTiles.filter((tile) => favorites.has(tile.id)),
    [visibleTiles, favorites],
  );

  const onTileClick = (tile: Tile) => {
    const dest = tile.to ?? `/services/${tile.id}`;
    // External URLs (admin shortcut etc.) bypass react-router so the
    // browser does a real navigation across origins / ports. Internal
    // paths stay in-app.
    if (/^https?:\/\//i.test(dest)) {
      window.location.href = dest;
      return;
    }
    navigate(dest);
  };

  return (
    <>
      <TopBar title={t('services.title')} unreadCount={unreadCount} />

      {/* My Requests entry banner — Rule 3 (sacred dark CTA): primary
          screen action gets ink-950 surface with white type. Rule 2
          (curve hierarchy): rounded-3xl panel-tier. The wrench tile sits
          one tier below at rounded-2xl. */}
      <button
        type="button"
        onClick={() => navigate('/services/requests')}
        className="group mx-3 mt-3 mb-1 w-[calc(100%-1.5rem)] flex flex-row items-center gap-3 rounded-3xl bg-ink-950 dark:bg-white text-white dark:text-ink-950 hover:shadow-lg active:scale-[0.99] transition-all duration-base ease-smooth px-4 py-4 text-start shadow-md"
      >
        <div className="w-11 h-11 rounded-2xl bg-white/10 dark:bg-ink-950/10 flex items-center justify-center flex-shrink-0">
          <Wrench size={20} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body-md font-bold leading-tight truncate">
            {t('services.myRequestsBanner.title')}
          </p>
          <p className="text-label-sm normal-case tracking-normal font-normal opacity-70 leading-tight truncate">
            {t('services.myRequestsBanner.subtitle')}
          </p>
        </div>
        <ChevronRight
          size={18}
          className="flex-shrink-0 rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
        />
      </button>

      <SearchBar value={query} onChange={setQuery} />

      {!q && favoriteTiles.length > 0 && (
        <>
          <SectionHeader label="Favorites" />
          <TileGrid tiles={favoriteTiles} query={q} onTileClick={onTileClick} />
        </>
      )}

      {SERVICE_SECTIONS.map((sec) => {
        const tiles = tilesBySection[sec.key];
        if (tiles.length === 0) return null;
        return (
          <div key={sec.key}>
            <SectionHeader label={sec.label} />
            <TileGrid tiles={tiles} query={q} onTileClick={onTileClick} />
          </div>
        );
      })}

      {filteredTiles.length === 0 && (
        <div className="flex flex-col items-center justify-center px-6 py-12">
          <div className="w-14 h-14 rounded-full bg-sand-100 dark:bg-ink-700 flex items-center justify-center mb-3 text-ink-500">
            <Search size={26} strokeWidth={1.75} />
          </div>
          <p className="text-body-md text-ink-500 dark:text-ink-100 text-center">
            No services match &ldquo;{query}&rdquo;
          </p>
        </div>
      )}
    </>
  );
}
