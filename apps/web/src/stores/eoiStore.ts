// EOI form draft + submission history.
// Draft is auto-persisted to localStorage so users don't lose progress.
// Submissions are in-memory only — replaced by GET /api/v1/discover/eoi
// in Week 3+ once the backend endpoint exists.

import { create } from 'zustand';

import type { EoiInput } from '@/lib/schemas/eoi';

const STORAGE_KEY = 'stitch.eoi.draft';

function loadDraft(): Partial<EoiInput> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<EoiInput>) : {};
  } catch {
    return {};
  }
}

function persistDraft(draft: Partial<EoiInput>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // quota / private mode — silent
  }
}

interface EoiState {
  draft: Partial<EoiInput>;
  submissions: EoiInput[];
  setDraft: (patch: Partial<EoiInput>) => void;
  clearDraft: () => void;
  addSubmission: (submission: EoiInput) => void;
}

export const useEoiStore = create<EoiState>((set, get) => ({
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
    // Clear draft after a successful submission so the next visit starts blank.
    persistDraft({});
    set({ draft: {} });
  },
}));
