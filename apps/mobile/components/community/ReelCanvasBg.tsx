import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { VISUAL_PALETTE, type StoryVisual } from '@/lib/mock/feedStories';

import { Gradient } from './Gradient';

/**
 * Animated background per reel visual kind. We don't render a real canvas —
 * each variant runs a single cheap Reanimated transform over a gradient so
 * the list stays smooth in FlashList.
 */
export function ReelCanvasBg({ visual, height }: { visual: StoryVisual; height: number }) {
  const palette = VISUAL_PALETTE[visual];

  return (
    <Gradient from={palette.from} to={palette.to} style={{ height, width: '100%' }} radius={0}>
      <View className="absolute inset-0 overflow-hidden">
        {visual === 'water' && <WaterFlow />}
        {visual === 'zen' && <ZenPulse />}
        {visual === 'fire' && <FireFlicker />}
        {visual === 'leaves' && <LeavesDrift />}
        {visual === 'sparkle' && <SparkleParticles />}
      </View>
    </Gradient>
  );
}

function WaterFlow() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(t);
  }, [t]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -20 + t.value * 40 }, { scaleX: 1.2 }],
    opacity: 0.35,
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: '40%',
          left: 0,
          right: 0,
          height: 80,
          borderRadius: 100,
          backgroundColor: '#fff',
        },
        style,
      ]}
    />
  );
}

function ZenPulse() {
  const s = useSharedValue(0.85);
  useEffect(() => {
    s.value = withRepeat(
      withTiming(1.1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(s);
  }, [s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: 0.3 }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: '20%',
          left: '25%',
          width: '50%',
          aspectRatio: 1,
          borderRadius: 999,
          backgroundColor: '#fff',
        },
        style,
      ]}
    />
  );
}

function FireFlicker() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) }),
      -1,
      false,
    );
    return () => cancelAnimation(t);
  }, [t]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: 60 - t.value * 80 }, { scale: 1 + t.value * 0.4 }],
    opacity: 0.45 * (1 - t.value),
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 0,
          left: '30%',
          width: '40%',
          height: 80,
          borderRadius: 60,
          backgroundColor: '#FED7AA',
        },
        style,
      ]}
    />
  );
}

function LeavesDrift() {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(360, { duration: 14000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(r);
  }, [r]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${r.value}deg` }],
    opacity: 0.4,
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: '15%',
          right: '10%',
          width: 90,
          height: 90,
          borderRadius: 999,
          borderWidth: 8,
          borderColor: '#fff',
          borderStyle: 'dashed',
        },
        style,
      ]}
    />
  );
}

function SparkleParticles() {
  const a = useSharedValue(0);
  useEffect(() => {
    a.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(a);
  }, [a]);
  const dot = useAnimatedStyle(() => ({
    opacity: 0.4 + a.value * 0.6,
    transform: [{ scale: 0.8 + a.value * 0.4 }],
  }));
  const dot2 = useAnimatedStyle(() => ({
    opacity: 0.9 - a.value * 0.7,
    transform: [{ scale: 1.1 - a.value * 0.3 }],
  }));
  return (
    <>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: '20%',
            left: '20%',
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: '#fff',
          },
          dot,
        ]}
      >
        <Text style={{ position: 'absolute', top: -4, left: -3, fontSize: 18, color: '#fff' }}>
          ✦
        </Text>
      </Animated.View>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: '55%',
            left: '60%',
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: '#fff',
          },
          dot2,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: '35%',
            right: '15%',
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#fff',
          },
          dot,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: '20%',
            left: '40%',
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: '#fff',
          },
          dot2,
        ]}
      />
    </>
  );
}
