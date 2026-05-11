import { Play } from 'lucide-react-native';
import { memo } from 'react';
import { Dimensions, Pressable, Text, View } from 'react-native';

import type { FeedReel } from '@/lib/mock/feedReels';

import { ReelCanvasBg } from './ReelCanvasBg';

const SCREEN_W = Dimensions.get('window').width;
const REEL_H = 280;

function ReelCardImpl({ reel }: { reel: FeedReel }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Play reel: ${reel.title}`}
      className="mx-4 mb-4 rounded-2xl overflow-hidden"
      style={{ width: SCREEN_W - 32, height: REEL_H }}
    >
      <ReelCanvasBg visual={reel.visual} height={REEL_H} />

      {/* Top-right: REEL chip */}
      <View className="absolute top-3 right-3 bg-black/30 px-2 py-1 rounded-md">
        <Text className="text-white text-[10px] font-bold tracking-wider">REEL</Text>
      </View>

      {/* Centered play button */}
      <View className="absolute inset-0 items-center justify-center">
        <View
          className="w-16 h-16 rounded-full items-center justify-center"
          style={{
            backgroundColor: 'rgba(255,255,255,0.25)',
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.6)',
          }}
        >
          <Play color="#fff" size={26} fill="#fff" />
        </View>
      </View>

      {/* Bottom gradient overlay for legibility */}
      <View
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: 110,
          backgroundColor: 'rgba(0,0,0,0.35)',
          padding: 14,
          justifyContent: 'flex-end',
        }}
      >
        <Text className="text-white text-base font-bold mb-1" numberOfLines={1}>
          {reel.title}
        </Text>
        <Text className="text-white/80 text-xs leading-4" numberOfLines={2}>
          {reel.desc}
        </Text>
        <Text className="text-white/60 text-[10px] mt-1">{reel.when}</Text>
      </View>
    </Pressable>
  );
}

export const ReelCard = memo(ReelCardImpl);
