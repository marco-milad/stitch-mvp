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
      transitionTimingFunction: {
        // Premium motion language. `smooth` = Apple's standard ease (UI moves).
        // `spring` = gentle overshoot (hovers, badge pops). `snap` = decisive
        // tactile (press-down, dismiss). Replace `ease-out` site-by-site.
        smooth: 'cubic-bezier(0.32, 0.72, 0, 1)',
        spring: 'cubic-bezier(0.5, 1.5, 0.6, 1)',
        snap: 'cubic-bezier(0.2, 0, 0, 1.2)',
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
        // Mesh background — three blobs drift at different rates so the
        // overall colour wash never repeats inside a session.
        meshDriftA: {
          '0%, 100%': { transform: 'translate3d(-10%, -8%, 0) scale(1.1)' },
          '50%': { transform: 'translate3d(8%, 6%, 0) scale(1.25)' },
        },
        meshDriftB: {
          '0%, 100%': { transform: 'translate3d(12%, 8%, 0) scale(1.2)' },
          '50%': { transform: 'translate3d(-6%, -10%, 0) scale(1.1)' },
        },
        meshDriftC: {
          '0%, 100%': { transform: 'translate3d(0, 10%, 0) scale(1.15)' },
          '50%': { transform: 'translate3d(-10%, -6%, 0) scale(1.3)' },
        },
        // Stagger entrance — translate + fade. Children compose with their
        // own `style={{ animationDelay: ... }}` to cascade.
        riseIn: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        // Farah orb — slow breath. Pairs with hue-rotate filter for state.
        orbBreathe: {
          '0%, 100%': { transform: 'scale(0.96)' },
          '50%': { transform: 'scale(1.04)' },
        },
        // Phrase orbit — used by Voice empty-state suggestion chips.
        orbitSlow: {
          '0%': { transform: 'rotate(0deg) translateX(var(--orbit-r, 96px)) rotate(0deg)' },
          '100%': {
            transform: 'rotate(360deg) translateX(var(--orbit-r, 96px)) rotate(-360deg)',
          },
        },
        // Stroke-draw a 2-segment path (the resolve checkmark).
        checkDraw: {
          '0%': { strokeDashoffset: '40' },
          '100%': { strokeDashoffset: '0' },
        },
        // Caret blink for type-on subtitles.
        caretBlink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
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
        'mesh-a': 'meshDriftA 18s ease-in-out infinite',
        'mesh-b': 'meshDriftB 22s ease-in-out infinite',
        'mesh-c': 'meshDriftC 26s ease-in-out infinite',
        'rise-in': 'riseIn 420ms cubic-bezier(0.32, 0.72, 0, 1) both',
        'orb-breathe': 'orbBreathe 4.2s ease-in-out infinite',
        'orbit-slow': 'orbitSlow 22s linear infinite',
        'check-draw': 'checkDraw 520ms cubic-bezier(0.32, 0.72, 0, 1) forwards',
        'caret-blink': 'caretBlink 900ms steps(2) infinite',
      },
    },
  },
  plugins: [],
};
