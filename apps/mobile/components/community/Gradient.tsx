import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

let __gradId = 0;
const nextId = () => `stitch-grad-${++__gradId}`;

interface Props {
  from: string;
  to: string;
  /** Angle in degrees (0 = top-to-bottom, 135 = top-left to bottom-right). Default 135. */
  angle?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Border radius applied to the wrapping view (clips the gradient). */
  radius?: number;
}

/**
 * Lightweight linear-gradient background using react-native-svg.
 * We use SVG (already in deps) instead of pulling in expo-linear-gradient.
 */
export function Gradient({ from, to, angle = 135, style, children, radius = 0 }: Props) {
  const id = nextId();
  const rad = (angle * Math.PI) / 180;
  const x2 = (Math.cos(rad) + 1) / 2;
  const y2 = (Math.sin(rad) + 1) / 2;

  return (
    <View style={[{ overflow: 'hidden', borderRadius: radius }, style]}>
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
            <Stop offset="0" stopColor={from} stopOpacity="1" />
            <Stop offset="1" stopColor={to} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {children}
    </View>
  );
}
