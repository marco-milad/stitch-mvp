// Profile-completion state for the post-signup mandatory onboarding gate.
//
// Captures the five fields the Waterway brief requires before a resident
// can use the rest of the app:
//   firstName, lastName, phoneNumber  — text inputs
//   profilePhotoDataUrl               — required photo upload (data URL,
//                                       persisted to localStorage)
//   serviceQualityRating              — required 1–10 slider
//
// `isComplete` is the gate predicate. When false, the
// CompleteProfileGate (in App.tsx) redirects authenticated residents to
// /complete-profile and blocks the rest of the app.
//
// Defaults to NOT complete so the gate fires on first sign-in — the
// architecturally-honest behaviour. Devtools can flip it by calling
// `useCompleteProfileStore.getState().reset()`.
//
// Important: national ID / passport fields are intentionally absent
// per the client spec. Don't add them.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CompleteProfileFields {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  profilePhotoDataUrl: string | null;
  serviceQualityRating: number | null;
}

interface CompleteProfileState extends CompleteProfileFields {
  /** Atomic save — used by the form on successful submit. Once true the
   *  gate stops redirecting. */
  isComplete: boolean;
  setFields: (patch: Partial<CompleteProfileFields>) => void;
  markComplete: () => void;
  reset: () => void;
}

const EMPTY: CompleteProfileFields = {
  firstName: '',
  lastName: '',
  phoneNumber: '',
  profilePhotoDataUrl: null,
  serviceQualityRating: null,
};

export const useCompleteProfileStore = create<CompleteProfileState>()(
  persist(
    (set) => ({
      ...EMPTY,
      isComplete: false,
      setFields: (patch) => set((s) => ({ ...s, ...patch })),
      markComplete: () => set({ isComplete: true }),
      reset: () => set({ ...EMPTY, isComplete: false }),
    }),
    {
      name: 'stitch.completeProfile',
      // Only persist the data + isComplete, not the action functions.
      partialize: (s) => ({
        firstName: s.firstName,
        lastName: s.lastName,
        phoneNumber: s.phoneNumber,
        profilePhotoDataUrl: s.profilePhotoDataUrl,
        serviceQualityRating: s.serviceQualityRating,
        isComplete: s.isComplete,
      }),
    },
  ),
);

/** True when every mandatory field has a value. Used by the form's
 *  submit-disabled state and by the gate redirect logic. */
export function isProfileFullyComplete(s: CompleteProfileFields): boolean {
  return (
    s.firstName.trim().length > 0 &&
    s.lastName.trim().length > 0 &&
    s.phoneNumber.trim().length > 0 &&
    s.profilePhotoDataUrl !== null &&
    s.serviceQualityRating !== null
  );
}

/** Convenience selector for the gate. */
export const useIsProfileComplete = (): boolean => useCompleteProfileStore((s) => s.isComplete);
