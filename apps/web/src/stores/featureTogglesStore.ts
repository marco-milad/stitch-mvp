// Feature-toggle registry — the single source of truth for "is feature X
// visible to the resident?". Persisted to localStorage so reloads keep
// the toggled state, and structured so the future Admin Dashboard can
// flip these at runtime without redeploys.
//
// Adding a new toggle:
//   1. Add the key + a `false` default below.
//   2. Add a named selector hook at the bottom for reference stability.
//   3. Wrap the UI surface(s) in the conditional.
//
// IMPORTANT: toggles only gate UI. Routes, handlers, mock data, and
// backend endpoints stay intact — flipping a toggle back to true must
// restore the feature with zero code changes.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FeatureToggles {
  /** Show the "Invite Guest" CTA + QR Invite quick action (parking
   *  invitation flow). Default: false — the flow ships hidden until
   *  the product team enables it from the admin dashboard. */
  showParkingInvitations: boolean;
  /** Render duration labels ("60 min", etc.) alongside service offerings.
   *  Hidden by default so the catalog reads as "service + price" only. */
  showServiceDurations: boolean;
}

interface FeatureTogglesState extends FeatureToggles {
  setToggle: <K extends keyof FeatureToggles>(key: K, value: FeatureToggles[K]) => void;
  setAll: (patch: Partial<FeatureToggles>) => void;
  reset: () => void;
}

const DEFAULTS: FeatureToggles = {
  showParkingInvitations: false,
  showServiceDurations: false,
};

export const useFeatureTogglesStore = create<FeatureTogglesState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setToggle: (key, value) => set({ [key]: value } as Partial<FeatureTogglesState>),
      setAll: (patch) => set(patch),
      reset: () => set(DEFAULTS),
    }),
    {
      name: 'stitch.featureToggles',
      // Persisted snapshot includes only the toggle values, never the
      // setters — keeps localStorage tidy and avoids serialising fns.
      partialize: (s): FeatureToggles => ({
        showParkingInvitations: s.showParkingInvitations,
        showServiceDurations: s.showServiceDurations,
      }),
    },
  ),
);

// ─── Named selectors ──────────────────────────────────────────────────────
// One selector per flag = reference-stable subscription. A component that
// only reads `showServiceDurations` won't re-render when an unrelated
// toggle flips.

export const useShowParkingInvitations = (): boolean =>
  useFeatureTogglesStore((s) => s.showParkingInvitations);

export const useShowServiceDurations = (): boolean =>
  useFeatureTogglesStore((s) => s.showServiceDurations);
