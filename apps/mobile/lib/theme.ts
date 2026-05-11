/**
 * Centralised colour tokens. NativeWind classes (`bg-brand-500`, etc.) cover
 * most cases; raw values live here for places NativeWind can't reach (e.g.
 * navigator props like `tabBarActiveTintColor`).
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
  accent: '#7C3AED',
  ink: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    400: '#94A3B8',
    500: '#64748B',
    700: '#334155',
    900: '#0F172A',
  },
  white: '#FFFFFF',
} as const;
