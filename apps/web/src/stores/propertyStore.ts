// Resident-mode property selection. Hydrates from MOCK_PROPERTIES today;
// swap to a TanStack Query `useProperties()` hook once the apps/api endpoint
// lands. Selected unit persists across reloads so the Home tab opens to
// whatever the user last switched to.

import { create } from 'zustand';

import { MOCK_PROPERTIES } from '@/lib/mock/properties';
import type { Property } from '@/lib/schemas/property';

const STORAGE_KEY = 'stitch.currentProperty';

function loadCurrentId(properties: ReadonlyArray<Property>): string {
  const fallback = properties.find((p) => p.primary)?.id ?? properties[0]?.id ?? '';
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    // Only honor a stored id that still exists in the portfolio.
    return properties.some((p) => p.id === raw) ? raw : fallback;
  } catch {
    return fallback;
  }
}

function persistCurrentId(id: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // quota / private mode — silent
  }
}

interface PropertyState {
  properties: ReadonlyArray<Property>;
  currentPropertyId: string;
  setCurrentProperty: (id: string) => void;
}

export const usePropertyStore = create<PropertyState>((set) => ({
  properties: MOCK_PROPERTIES,
  currentPropertyId: loadCurrentId(MOCK_PROPERTIES),
  setCurrentProperty: (id) => {
    persistCurrentId(id);
    set({ currentPropertyId: id });
  },
}));

/** Selector hook — `undefined` only during the brief startup window if storage is empty. */
export function useCurrentProperty(): Property | undefined {
  return usePropertyStore((s) => s.properties.find((p) => p.id === s.currentPropertyId));
}
