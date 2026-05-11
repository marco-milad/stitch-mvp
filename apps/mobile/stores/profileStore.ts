// Profile-related UI state (brightness boost, completion checklist).
// TODO: API — completion + theme will sync to users.preferences in Week 2.

import { create } from 'zustand';

interface ProfileState {
  brightnessBoost: boolean;
  toggleBrightness: () => void;
  /** Mock completion checklist — true = done. */
  completion: {
    photo: boolean;
    phone: boolean;
    unit: boolean;
    emergency: boolean;
    language: boolean;
    payment: boolean;
    notifications: boolean;
    twoFactor: boolean;
  };
}

export const useProfileStore = create<ProfileState>((set) => ({
  brightnessBoost: false,
  toggleBrightness: () => set((s) => ({ brightnessBoost: !s.brightnessBoost })),
  completion: {
    photo: true,
    phone: true,
    unit: true,
    emergency: true,
    language: true,
    payment: false,
    notifications: false,
    twoFactor: false,
  },
}));

export function completionPercent(c: ProfileState['completion']): number {
  const items = Object.values(c);
  return Math.round((items.filter(Boolean).length / items.length) * 100);
}
