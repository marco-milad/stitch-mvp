// Resident outstanding-balance state. Today a single mock count seeded
// to match the prior `MOCK_DUE_PAYMENTS` constant; Week-2 wire-up
// replaces the seed with `GET /api/v1/me/payments?status=due`.
//
// The count drives operational business rules: when > 0, certain
// features (Invite Guest CTA, etc.) auto-suspend with a microcopy
// notice instead of disappearing. Suspension is reversible — paying
// off the balance flips features back on with zero code change.

import { create } from 'zustand';

interface DuePaymentsState {
  count: number;
  setCount: (n: number) => void;
}

export const useDuePaymentsStore = create<DuePaymentsState>((set) => ({
  count: 1,
  setCount: (n) => set({ count: Math.max(0, n) }),
}));

/** Selector — true when any balance is outstanding. */
export const useHasOverdueBalance = (): boolean => useDuePaymentsStore((s) => s.count > 0);
