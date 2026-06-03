/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ─── Brand identity (NEW — mirrors apps/web/tailwind.config.js) ──
        // See web config for the full token rationale + migration notes.
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
          DEFAULT: '#7C3AED', // legacy violet kept for back-compat
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
        // ─── Legacy (preserved for back-compat) ─────────────────────────
        brand: {
          50: '#ECFEFF',
          100: '#CFFAFE',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
        },
        danger: '#DC2626',
        warning: '#D97706',
        success: '#16A34A',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Source Serif 4', 'Georgia', 'serif'],
        tabular: ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['36px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'display-lg': [
          '28px',
          { lineHeight: '34px', letterSpacing: '-0.015em', fontWeight: '700' },
        ],
        'display-md': ['22px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'heading-lg': [
          '18px',
          { lineHeight: '24px', letterSpacing: '-0.005em', fontWeight: '600' },
        ],
        'heading-md': ['16px', { lineHeight: '22px', fontWeight: '600' }],
        'body-lg': ['15px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.04em', fontWeight: '600' }],
        'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.06em', fontWeight: '700' }],
        caption: ['10px', { lineHeight: '14px', letterSpacing: '0.02em', fontWeight: '500' }],
      },
      borderRadius: {
        xs: '6px',
        sm: '12px',
        md: '16px',
        lg: '20px',
        xl: '24px',
        '2xl': '32px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(15,15,18,0.04), 0 1px 3px rgba(15,15,18,0.05)',
        md: '0 4px 12px rgba(15,15,18,0.06), 0 2px 4px rgba(15,15,18,0.04)',
        lg: '0 12px 32px rgba(15,15,18,0.08), 0 4px 8px rgba(15,15,18,0.05)',
        xl: '0 24px 64px rgba(15,15,18,0.12), 0 8px 16px rgba(15,15,18,0.06)',
        accent: '0 8px 24px rgba(232,199,96,0.30)',
      },
      backgroundImage: {
        'wash-cream': 'linear-gradient(180deg, #FBF7F0 0%, #F4EEE3 50%, #FBF7F0 100%)',
        'wash-sunset': 'linear-gradient(135deg, #F4EEE3 0%, #F2DC91 60%, #D7C8AA 100%)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.32, 0.72, 0, 1)',
        spring: 'cubic-bezier(0.5, 1.5, 0.6, 1)',
        snap: 'cubic-bezier(0.2, 0, 0, 1.2)',
      },
      transitionDuration: {
        fast: '180ms',
        base: '280ms',
        slow: '480ms',
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
        // Stagger entrance — duplicated from web config.
        riseIn: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        // Dispatch puck — travels button → tech card.
        puckGlide: {
          '0%': {
            transform: 'translate(var(--puck-from-x, 0px), var(--puck-from-y, 0px)) scale(0.4)',
            opacity: '0',
          },
          '15%': {
            opacity: '1',
            transform: 'translate(var(--puck-from-x, 0px), var(--puck-from-y, 0px)) scale(1)',
          },
          '85%': { opacity: '1' },
          '100%': {
            transform: 'translate(var(--puck-to-x, 0px), var(--puck-to-y, 0px)) scale(0.6)',
            opacity: '0',
          },
        },
        // Resolve row fade — dims to 60% then settles.
        rowResolve: {
          '0%': { opacity: '1' },
          '50%': { opacity: '0.55' },
          '100%': { opacity: '1' },
        },
        // Stroke-draw check (mirrors web's checkDraw).
        checkDraw: {
          '0%': { strokeDashoffset: '40' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        'scan-slide-in': 'scanSlideIn 240ms ease-out',
        glint: 'glint 1.6s ease-out infinite',
        'alert-pulse': 'alertPulse 0.9s ease-in-out infinite',
        'alert-flash': 'alertFlash 1.5s ease-out forwards',
        wave: 'wave 2s ease-out infinite',
        'rise-in': 'riseIn 420ms cubic-bezier(0.32, 0.72, 0, 1) both',
        'puck-glide': 'puckGlide 1100ms cubic-bezier(0.32, 0.72, 0, 1) forwards',
        'row-resolve': 'rowResolve 900ms cubic-bezier(0.32, 0.72, 0, 1)',
        'check-draw': 'checkDraw 520ms cubic-bezier(0.32, 0.72, 0, 1) forwards',
      },
    },
  },
  plugins: [],
};
