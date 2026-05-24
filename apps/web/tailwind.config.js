/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Stitch palette — kept in sync with apps/mobile/tailwind.config.js
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
      },
      keyframes: {
        waterFlow: {
          '0%, 100%': { transform: 'translateY(-20px) scaleX(1.2)' },
          '50%': { transform: 'translateY(20px) scaleX(1.2)' },
        },
        zenPulse: {
          '0%, 100%': { transform: 'scale(0.85)' },
          '50%': { transform: 'scale(1.1)' },
        },
        fireFlicker: {
          '0%': { transform: 'translateY(60px) scale(1)', opacity: '0.45' },
          '100%': { transform: 'translateY(-20px) scale(1.4)', opacity: '0' },
        },
        leavesDrift: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        sparkleA: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
        sparkleB: {
          '0%, 100%': { opacity: '0.9', transform: 'scale(1.1)' },
          '50%': { opacity: '0.2', transform: 'scale(0.8)' },
        },
        orbPulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
        },
        countdownRing: {
          from: { strokeDashoffset: '0' },
          to: { strokeDashoffset: 'var(--circumference)' },
        },
        storyProgress: {
          from: { width: '0%' },
          to: { width: '100%' },
        },
        ticketIn: {
          '0%': { transform: 'translateY(-6px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        badgeFlip: {
          '0%, 100%': {
            transform: 'scale(1)',
            boxShadow: '0 0 0 0 rgba(124, 58, 237, 0)',
          },
          '40%': {
            transform: 'scale(1.15)',
            boxShadow: '0 0 0 6px rgba(124, 58, 237, 0.25)',
          },
        },
        badgeFlipResolved: {
          '0%, 100%': {
            transform: 'scale(1)',
            boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)',
          },
          '40%': {
            transform: 'scale(1.18)',
            boxShadow: '0 0 0 8px rgba(16, 185, 129, 0.35)',
          },
        },
        techReveal: {
          '0%': { transform: 'translateY(6px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        qrRise: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        qrShimmer: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(6, 182, 212, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(6, 182, 212, 0)' },
        },
      },
      animation: {
        'water-flow': 'waterFlow 3.2s ease-in-out infinite',
        'zen-pulse': 'zenPulse 2.4s ease-in-out infinite',
        'fire-flicker': 'fireFlicker 1.8s ease-out infinite',
        'leaves-drift': 'leavesDrift 14s linear infinite',
        'sparkle-a': 'sparkleA 1.6s ease-in-out infinite',
        'sparkle-b': 'sparkleB 1.6s ease-in-out infinite',
        'orb-pulse': 'orbPulse 1.4s ease-in-out infinite',
        'ticket-in': 'ticketIn 240ms ease-out',
        'badge-flip': 'badgeFlip 600ms ease-out',
        'badge-flip-resolved': 'badgeFlipResolved 700ms ease-out',
        'tech-reveal': 'techReveal 300ms ease-out',
        'qr-rise': 'qrRise 320ms ease-out',
        'qr-shimmer': 'qrShimmer 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
