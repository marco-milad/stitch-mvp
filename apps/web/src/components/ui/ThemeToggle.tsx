// Header dark-mode pill — glass button with a Lucide Moon/Sun icon that
// swaps on toggle. Sized to match TopBar's bell + avatar buttons.
//
// Visuals:
//   - Card-tier glass (bg-white/60 + backdrop-blur-md + border-white/40)
//   - Specular sheen highlight on hover (matches our tilt vocabulary)
//   - Icon swap morph — outgoing icon scales/rotates out as the
//     incoming one scales in (no library, pure CSS)
//
// Accessibility: `aria-pressed` reflects the state; the visible label
// describes what tapping will do, not what mode is active.

import { Moon, Sun } from 'lucide-react';

import { useThemeStore } from '@/stores/themeStore';

export function ThemeToggle() {
  const isDark = useThemeStore((s) => s.isDark);
  const toggle = useThemeStore((s) => s.toggle);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="group relative w-9 h-9 rounded-full bg-white/60 dark:bg-ink-700/60 backdrop-blur-md border border-white/40 dark:border-white/10 flex items-center justify-center overflow-hidden hover:bg-white/80 dark:hover:bg-ink-700/80 hover:scale-105 active:scale-95 transition-all duration-200 ease-smooth"
    >
      {/* Soft specular highlight — sits centred at the default --tx/--ty
          values (no useTilt binding needed for a 36px button). */}
      <span
        aria-hidden
        className="absolute inset-0 tilt-sheen opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />

      {/* Icon stack — both icons are rendered absolutely; the active one
          fades + scales + rotates into place while the other rotates out. */}
      <span
        aria-hidden
        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-smooth ${
          isDark ? 'opacity-0 scale-50 -rotate-90' : 'opacity-100 scale-100 rotate-0'
        }`}
      >
        <Moon size={18} className="text-ink-700 dark:text-ink-100" />
      </span>
      <span
        aria-hidden
        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-smooth ${
          isDark ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-90'
        }`}
      >
        <Sun size={18} className="text-amber-400" />
      </span>
    </button>
  );
}
