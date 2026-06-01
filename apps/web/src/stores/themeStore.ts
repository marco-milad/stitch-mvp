// Shared dark-mode state. Lives in Zustand (matches the rest of the
// project) so the TopBar toggle and the Profile dark-mode row stay in
// sync. Persists to localStorage under `stitch.theme` and applies the
// `dark` class to <html> whenever it changes, so Tailwind's
// `dark:` variants pick it up.
//
// A small bootstrap script in main.tsx applies the persisted choice
// BEFORE React mounts to avoid the light-theme flash on initial load.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  setDark: (dark: boolean) => void;
}

function applyDarkClass(dark: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', dark);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Pre-rehydration default. The `onRehydrateStorage` callback
      // applies the persisted value to the DOM right after.
      isDark:
        typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
      toggle: () => {
        const next = !get().isDark;
        applyDarkClass(next);
        set({ isDark: next });
      },
      setDark: (dark) => {
        applyDarkClass(dark);
        set({ isDark: dark });
      },
    }),
    {
      name: 'stitch.theme',
      partialize: (s) => ({ isDark: s.isDark }),
      onRehydrateStorage: () => (state) => {
        if (state) applyDarkClass(state.isDark);
      },
    },
  ),
);
