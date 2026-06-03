/** @type {import('tailwindcss').Config} */
//
// Stitch Brand Identity tokens — extracted from the CoStar / Sunset Vista /
// Aurora Retreat reference set. See the design-system spec in the project
// docs for the rule-set ("photo-first, paint-second", "one accent per
// screen", "dark CTAs are sacred", "two glass flavours", "curves grow with
// hierarchy"). This file is the single source of truth — apps/admin mirrors
// it, mobile keeps a parallel copy.
//
// IMPORTANT migration notes for downstream callers:
// - `accent` was a flat violet string. It's now a yellow palette with a
//   DEFAULT key set to the previous violet so `bg-accent` etc. don't
//   silently break. New code should use `accent-300` for the brand yellow.
// - `ink-900` shifted from cool slate (#0F172A) to warm graphite (#161718)
//   to match the brand sand/cream palette. Every `bg-ink-900` will warm
//   ~5° in hue — intentional.
// - Default Tailwind border radii (sm/md/lg/xl/2xl) are overridden with
//   the brand "ultra-curved" values (12/16/20/24/32 px). Every existing
//   rounded utility will visibly grow. Aligns with the spec intent.

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ─── Brand identity (NEW) ───────────────────────────────────────
        // Warm graphite scale — replaces the cool-slate ink palette.
        ink: {
          50: '#F8FAFC', // kept for back-compat; existing usages stay readable
          100: '#F1F5F9', // kept for back-compat
          300: '#A9A39A',
          400: '#94A3B8', // kept for back-compat
          500: '#6B6660',
          700: '#3A3B3D',
          900: '#161718',
          950: '#0A0B0D', // primary CTA fill
        },
        // Cream/sand backdrop family — long surfaces, card surfaces.
        sand: {
          50: '#FBF7F0',
          100: '#F4EEE3',
          200: '#E8DEC9',
          300: '#D7C8AA',
        },
        // Single warm accent — "one yellow per surface" rule.
        accent: {
          DEFAULT: '#7C3AED', // preserves legacy `bg-accent` (violet) for back-compat
          50: '#FBF3D4',
          300: '#F2DC91',
          500: '#E8C760',
          700: '#7A6520',
        },
        // Status colors — warning intentionally matches accent-500 per spec.
        status: {
          success: '#3F8B5E',
          warning: '#E8C760',
          danger: '#B84A2E',
          info: '#5A7B95',
        },
        // ─── Legacy brand (preserved for back-compat) ───────────────────
        brand: {
          50: '#ECFEFF',
          100: '#CFFAFE',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
        },
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Source Serif 4', 'Georgia', 'serif'],
        tabular: ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
      },
      // Semantic display + body scale. Use these named tokens
      // (`text-display-xl`, `text-body-md`, …) instead of raw `text-2xl`
      // for new components so the type hierarchy stays consistent.
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
      // Brand curve hierarchy — chips 2xl, cards 3xl, hero panels 2xl(32px).
      // Pills stay rounded-full (Tailwind default). These OVERRIDE the
      // default Tailwind values intentionally so every existing rounded
      // utility shifts to the brand scale.
      borderRadius: {
        xs: '6px',
        sm: '12px',
        md: '16px',
        lg: '20px',
        xl: '24px',
        '2xl': '32px',
      },
      // Soft luxury shadows — low-opacity, two-layer offsets.
      boxShadow: {
        sm: '0 1px 2px rgba(15,15,18,0.04), 0 1px 3px rgba(15,15,18,0.05)',
        md: '0 4px 12px rgba(15,15,18,0.06), 0 2px 4px rgba(15,15,18,0.04)',
        lg: '0 12px 32px rgba(15,15,18,0.08), 0 4px 8px rgba(15,15,18,0.05)',
        xl: '0 24px 64px rgba(15,15,18,0.12), 0 8px 16px rgba(15,15,18,0.06)',
        accent: '0 8px 24px rgba(232,199,96,0.30)',
      },
      backgroundImage: {
        // Warm cream wash — drop on long surfaces (Home backdrop, booking
        // screens, dashboards) per rule 1.
        'wash-cream': 'linear-gradient(180deg, #FBF7F0 0%, #F4EEE3 50%, #FBF7F0 100%)',
        // Sunset gradient — hero-photo style fallback when no real image is
        // available (placeholders, skeleton heroes).
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
        riseIn: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        orbBreathe: {
          '0%, 100%': { transform: 'scale(0.96)' },
          '50%': { transform: 'scale(1.04)' },
        },
        orbitSlow: {
          '0%': { transform: 'rotate(0deg) translateX(var(--orbit-r, 96px)) rotate(0deg)' },
          '100%': {
            transform: 'rotate(360deg) translateX(var(--orbit-r, 96px)) rotate(-360deg)',
          },
        },
        checkDraw: {
          '0%': { strokeDashoffset: '40' },
          '100%': { strokeDashoffset: '0' },
        },
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
