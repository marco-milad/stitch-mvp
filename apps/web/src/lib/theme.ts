/**
 * Centralised colour tokens (kept in sync with apps/web/tailwind.config.js).
 * Tailwind classes (`bg-ink-950`, etc.) cover most cases; raw values live
 * here for places Tailwind can't reach (Lucide icon `color={}` props, inline
 * SVG stroke/fill, dynamic tones threaded through `style={}`).
 *
 * Brand identity: the warm `ink` + `sand` + `accent` triad. Legacy `brand`
 * cyan is preserved for back-compat callers (logos, residual chrome) but
 * net-new surfaces should land on the ink scale per Rule 3.
 */
export const colors = {
  brand: {
    50: '#ECFEFF',
    100: '#CFFAFE',
    400: '#22D3EE',
    500: '#06B6D4',
    600: '#0891B2',
    700: '#0E7490',
  },
  // Brand ink scale — mirrors tailwind.config.js. ink-300 is the warm
  // dusty tone used for inactive chrome; ink-950 is the sacred dark for
  // primary CTAs and active states.
  ink: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#A9A39A',
    400: '#94A3B8',
    500: '#6B6660',
    700: '#3A3B3D',
    800: '#1E293B',
    900: '#161718',
    950: '#0A0B0D',
  },
  sand: {
    50: '#FBF7F0',
    100: '#F4EEE3',
    200: '#E8DEC9',
    300: '#D7C8AA',
  },
  accent: {
    DEFAULT: '#7C3AED', // legacy violet
    50: '#FBF3D4',
    300: '#F2DC91',
    500: '#E8C760',
    700: '#7A6520',
  },
  status: {
    success: '#3F8B5E',
    warning: '#E8C760',
    danger: '#B84A2E',
    info: '#5A7B95',
  },
  white: '#FFFFFF',
} as const;
