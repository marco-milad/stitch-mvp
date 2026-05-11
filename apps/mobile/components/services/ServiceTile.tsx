import { Star } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { TONE_BG, TONE_FG, type ServiceTile as ServiceTileData } from '@/lib/mock/services';
import { useServicesStore } from '@/stores/servicesStore';

interface Props {
  tile: ServiceTileData;
  /** When set, the tile's name highlights this substring. */
  highlight?: string;
  onPress: () => void;
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

function ServiceTileImpl({ tile, highlight, onPress }: Props) {
  const fav = useServicesStore((s) => s.favorites.has(tile.id));
  const toggleFavorite = useServicesStore((s) => s.toggleFavorite);
  const popScale = useSharedValue(1);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: popScale.value }] }));

  const onFavPress = () => {
    popScale.value = withSequence(withSpring(1.3, { damping: 6 }), withSpring(1));
    toggleFavorite(tile.id);
  };

  const segments = highlightedSegments(tile.name, highlight ?? '');
  const Icon = tile.icon;
  const bg = TONE_BG[tile.tone];
  const fg = TONE_FG[tile.tone];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={tile.name}
      className="flex-1 m-1.5 bg-white dark:bg-ink-700 rounded-2xl p-3 border border-ink-100 dark:border-ink-700"
      style={{ minHeight: 130 }}
    >
      {/* Favorite star (top-right) */}
      <Pressable
        onPress={onFavPress}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={fav ? 'Remove favorite' : 'Add favorite'}
        className="absolute top-2 right-2"
      >
        <Animated.View style={popStyle}>
          <Star
            color={fav ? '#F59E0B' : '#CBD5E1'}
            fill={fav ? '#F59E0B' : 'transparent'}
            size={18}
          />
        </Animated.View>
      </Pressable>

      <View
        className="w-10 h-10 rounded-xl items-center justify-center mb-3"
        style={{ backgroundColor: bg }}
      >
        <Icon color={fg} size={20} />
      </View>

      <Text className="text-sm font-semibold text-ink-900 dark:text-white mb-0.5" numberOfLines={1}>
        {segments.map((seg, i) => (
          <Text
            key={i}
            style={seg.match ? { backgroundColor: '#FEF3C7', color: '#92400E' } : undefined}
          >
            {seg.text}
          </Text>
        ))}
      </Text>
      <Text className="text-[11px] text-ink-500 dark:text-ink-100" numberOfLines={1}>
        {tile.sub}
      </Text>
    </Pressable>
  );
}

export const ServiceTile = memo(ServiceTileImpl);
