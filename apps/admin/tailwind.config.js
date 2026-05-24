/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Stitch palette — mirrors apps/web/tailwind.config.js
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
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        danger: '#DC2626',
        warning: '#D97706',
        success: '#16A34A',
      },
      keyframes: {
        // Row enter — every new scan slides + fades in.
        scanSlideIn: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        // 🟢 Green Glint — subtle approval ring.
        glint: {
          '0%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.6)' },
          '70%': { boxShadow: '0 0 0 10px rgba(16, 185, 129, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' },
        },
        // 🔴 Red Ring Alert — faster, more emphatic.
        alertPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.7)' },
          '50%': { boxShadow: '0 0 0 8px rgba(220, 38, 38, 0)' },
        },
        alertFlash: {
          '0%': { backgroundColor: 'rgba(254, 226, 226, 0.9)' },
          '100%': { backgroundColor: 'rgba(254, 226, 226, 0)' },
        },
        // 🔵 Cyan Wave — resident exit ripple.
        wave: {
          '0%': {
            boxShadow: '0 0 0 0 rgba(34, 211, 238, 0.5), 0 0 0 0 rgba(34, 211, 238, 0.3)',
          },
          '70%': {
            boxShadow: '0 0 0 8px rgba(34, 211, 238, 0), 0 0 0 14px rgba(34, 211, 238, 0)',
          },
          '100%': {
            boxShadow: '0 0 0 0 rgba(34, 211, 238, 0), 0 0 0 0 rgba(34, 211, 238, 0)',
          },
        },
      },
      animation: {
        'scan-slide-in': 'scanSlideIn 240ms ease-out',
        glint: 'glint 1.6s ease-out infinite',
        'alert-pulse': 'alertPulse 0.9s ease-in-out infinite',
        'alert-flash': 'alertFlash 1.5s ease-out forwards',
        wave: 'wave 2s ease-out infinite',
      },
    },
  },
  plugins: [],
};
