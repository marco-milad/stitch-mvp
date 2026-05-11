import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SearchBar } from '@/components/services/SearchBar';
import { ServiceTile } from '@/components/services/ServiceTile';
import { TopBar } from '@/components/TopBar';
import {
  SERVICE_SECTIONS,
  SERVICE_TILES,
  searchCorpus,
  type ServiceSectionKey,
  type ServiceTile as Tile,
} from '@/lib/mock/services';
import { useServicesStore } from '@/stores/servicesStore';

// Mocking the current resident as an Owner so owner-only tiles
// (Construction, Documents) show by default.
const IS_OWNER = true;

function navigateForTile(tile: Tile) {
  // TODO: API — route to real screens once views land. For Phase 4.5 we
  // fan out to the closest existing destination.
  switch (tile.id) {
    case 'daily-book':
      return router.push('/qr');
    case 'daily-hotline':
    case 'comp-complaints':
      return router.push('/voice');
    case 'prop-payments':
    case 'prop-maint':
    case 'prop-unit':
      return router.push('/(tabs)/profile');
    case 'sales-appt':
    case 'sales-eoi':
      return router.push('/(tabs)/discover');
    default:
      return router.push('/voice');
  }
}

function TileGrid({ tiles, query }: { tiles: Tile[]; query: string }) {
  // 2-column layout via paired rows.
  const rows: Tile[][] = [];
  for (let i = 0; i < tiles.length; i += 2) {
    rows.push(tiles.slice(i, i + 2));
  }
  return (
    <View className="px-2.5">
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} className="flex-row">
          {row.map((tile) => (
            <ServiceTile
              key={tile.id}
              tile={tile}
              highlight={query}
              onPress={() => navigateForTile(tile)}
            />
          ))}
          {row.length === 1 && <View className="flex-1 m-1.5" />}
        </View>
      ))}
    </View>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <Text className="px-4 pt-4 pb-1 text-[11px] font-bold uppercase tracking-widest text-ink-400">
      {label}
    </Text>
  );
}

export default function Services() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const favorites = useServicesStore((s) => s.favorites);
  const q = query.trim().toLowerCase();

  const visibleTiles = useMemo(() => SERVICE_TILES.filter((t) => IS_OWNER || !t.ownerOnly), []);

  const filteredTiles = useMemo(() => {
    if (!q) return visibleTiles;
    return visibleTiles.filter((t) => searchCorpus(t).includes(q));
  }, [q, visibleTiles]);

  const tilesBySection = useMemo(() => {
    const map: Record<ServiceSectionKey, Tile[]> = {
      daily: [],
      compound: [],
      property: [],
      sales: [],
    };
    for (const t of filteredTiles) map[t.section].push(t);
    return map;
  }, [filteredTiles]);

  const favoriteTiles = useMemo(
    () => visibleTiles.filter((t) => favorites.has(t.id)),
    [visibleTiles, favorites],
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-ink-50 dark:bg-ink-900">
      <TopBar title={t('services.title')} unreadCount={3} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <SearchBar value={query} onChange={setQuery} />

        {/* Favorites — only shown when search is empty and there are favs */}
        {!q && favoriteTiles.length > 0 && (
          <>
            <SectionHeader label="⭐  Favorites" />
            <TileGrid tiles={favoriteTiles} query={q} />
          </>
        )}

        {SERVICE_SECTIONS.map((sec) => {
          const tiles = tilesBySection[sec.key];
          if (tiles.length === 0) return null;
          return (
            <View key={sec.key}>
              <SectionHeader label={sec.label} />
              <TileGrid tiles={tiles} query={q} />
            </View>
          );
        })}

        {filteredTiles.length === 0 && (
          <View className="items-center justify-center px-6 py-12">
            <Text className="text-5xl mb-3">🔎</Text>
            <Text className="text-base text-ink-500 text-center">
              No services match &ldquo;{query}&rdquo;
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
