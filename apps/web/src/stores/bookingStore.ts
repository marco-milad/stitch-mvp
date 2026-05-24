// Booking form draft + submission history. Mirrors eoiStore — separate
// instances by design (each form holds its own draft; no shared coupling).
// TODO: API — POST /api/v1/discover/bookings in Week 3+.

import { create } from 'zustand';

import type { BookingInput } from '@/lib/schemas/booking';

const STORAGE_KEY = 'stitch.book.draft';

function loadDraft(): Partial<BookingInput> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<BookingInput>) : {};
  } catch {
    return {};
  }
}

function persistDraft(draft: Partial<BookingInput>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // quota / private mode — silent
  }
}

interface BookingState {
  draft: Partial<BookingInput>;
  submissions: BookingInput[];
  setDraft: (patch: Partial<BookingInput>) => void;
  clearDraft: () => void;
  addSubmission: (submission: BookingInput) => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  draft: loadDraft(),
  submissions: [],
  setDraft: (patch) => {
    const next = { ...get().draft, ...patch };
    persistDraft(next);
    set({ draft: next });
  },
  clearDraft: () => {
    persistDraft({});
    set({ draft: {} });
  },
  addSubmission: (submission) => {
    set((s) => ({ submissions: [...s.submissions, submission] }));
    persistDraft({});
    set({ draft: {} });
  },
}));
