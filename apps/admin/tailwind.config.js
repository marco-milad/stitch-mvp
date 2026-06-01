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
      transitionTimingFunction: {
        // Mirrors apps/web/tailwind.config.js — duplicated rather than shared
        // to keep each workspace's config self-contained for now.
        smooth: 'cubic-bezier(0.32, 0.72, 0, 1)',
        spring: 'cubic-bezier(0.5, 1.5, 0.6, 1)',
        snap: 'cubic-bezier(0.2, 0, 0, 1.2)',
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
