import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  /** Total countdown duration in ms. */
  durationMs: number;
  /** Outer ring size in pts. */
  size: number;
  /** Stroke thickness. */
  thickness?: number;
  /** Called every time the countdown reaches zero (signal to refresh QR). */
  onTick?: () => void;
  /** Child rendered inside the ring (typically the QR). */
  children: React.ReactNode;
}

export function CountdownRing({ durationMs, size, thickness = 4, onTick, children }: Props) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: durationMs, easing: Easing.linear }, (finished) => {
        if (finished && onTick) runOnJS(onTick)();
      }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [durationMs, onTick, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={thickness}
          fill="transparent"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#06B6D4"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          fill="transparent"
          animatedProps={animatedProps}
        />
      </Svg>
      {children}
    </View>
  );
}
