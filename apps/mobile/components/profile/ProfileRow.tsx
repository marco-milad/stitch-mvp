import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors } from '@/lib/theme';

interface Props {
  Icon: LucideIcon;
  iconBg?: string;
  iconFg?: string;
  label: string;
  /** Right-aligned content (e.g. a switch, badge). Falls back to a chevron. */
  trailing?: React.ReactNode;
  destructive?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function ProfileRow({
  Icon,
  iconBg = '#F1F5F9',
  iconFg = '#475569',
  label,
  trailing,
  destructive,
  onPress,
  accessibilityLabel,
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const labelColor = destructive ? '#DC2626' : undefined;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (scale.value = withTiming(0.98, { duration: 80 }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: 120 }))}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Animated.View
        style={animatedStyle}
        className="flex-row items-center px-4 py-3 bg-white dark:bg-ink-700"
      >
        <View
          className="w-8 h-8 rounded-lg items-center justify-center mr-3"
          style={{ backgroundColor: destructive ? '#FEE2E2' : iconBg }}
        >
          <Icon color={destructive ? '#DC2626' : iconFg} size={16} />
        </View>
        <Text
          className="flex-1 text-sm text-ink-900 dark:text-white"
          style={labelColor ? { color: labelColor } : undefined}
          numberOfLines={1}
        >
          {label}
        </Text>
        {trailing ?? <ChevronRight color={colors.ink[400]} size={18} />}
      </Animated.View>
    </Pressable>
  );
}
