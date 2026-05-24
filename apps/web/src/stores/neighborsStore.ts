// Neighbors directory state: search query + role filter + interest filter.
// Not persisted — search/filter is session-scoped and resets between visits.
//
// Selector rule [[feedback-zustand-selectors]]: never call `.filter()` or
// `.map()` inside a Zustand selector — returns a new reference each render
// and triggers an infinite loop. Select raw state, derive in `useMemo`.

import { useMemo } from 'react';
import { create } from 'zustand';

import { MOCK_NEIGHBORS } from '@/lib/mock/neighbors';
import type { Interest, Neighbor, NeighborRole } from '@/lib/schemas/neighbors';
import { useCurrentProperty } from '@/stores/propertyStore';

export type RoleFilter = NeighborRole | 'all';
export type InterestFilter = Interest | 'all';

interface NeighborsState {
  neighbors: ReadonlyArray<Neighbor>;
  query: string;
  selectedRole: RoleFilter;
  selectedInterest: InterestFilter;
  setQuery: (q: string) => void;
  setRole: (r: RoleFilter) => void;
  setInterest: (i: InterestFilter) => void;
  reset: () => void;
}

export const useNeighborsStore = create<NeighborsState>((set) => ({
  neighbors: MOCK_NEIGHBORS,
  query: '',
  selectedRole: 'all',
  selectedInterest: 'all',
  setQuery: (q) => set({ query: q }),
  setRole: (r) => set({ selectedRole: r }),
  setInterest: (i) => set({ selectedInterest: i }),
  reset: () => set({ query: '', selectedRole: 'all', selectedInterest: 'all' }),
}));

/** Neighbors in the same zone as the current property. Returns an empty
 *  array when there's no current property. */
export function useImmediateNeighbors(): Neighbor[] {
  const property = useCurrentProperty();
  const neighbors = useNeighborsStore((s) => s.neighbors);
  return useMemo(() => {
    if (!property) return [];
    return neighbors.filter((n) => n.zone === property.zone);
  }, [neighbors, property]);
}

/** Search + role + interest filter applied. Sorted so neighbors in the
 *  current property's zone float to the top — they get the "Immediate"
 *  badge on the card too. */
export function useFilteredNeighbors(): Neighbor[] {
  const property = useCurrentProperty();
  const neighbors = useNeighborsStore((s) => s.neighbors);
  const query = useNeighborsStore((s) => s.query);
  const role = useNeighborsStore((s) => s.selectedRole);
  const interest = useNeighborsStore((s) => s.selectedInterest);

  return useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = neighbors.filter((n) => {
      if (role !== 'all' && n.role !== role) return false;
      if (interest !== 'all' && !n.interests.includes(interest)) return false;
      if (q) {
        // Match on name OR unit OR any interest key (so typing "yoga"
        // surfaces all yoga-interested neighbors even when the chip isn't
        // active). Private profiles are still searchable by name so the
        // user can find them — the *display* is still blurred.
        const haystack = `${n.name} ${n.unitName} ${n.interests.join(' ')}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    // Immediate first; within each group, alphabetical by name.
    const userZone = property?.zone;
    return [...out].sort((a, b) => {
      const aImmediate = userZone && a.zone === userZone ? 0 : 1;
      const bImmediate = userZone && b.zone === userZone ? 0 : 1;
      if (aImmediate !== bImmediate) return aImmediate - bImmediate;
      return a.name.localeCompare(b.name);
    });
  }, [neighbors, query, role, interest, property]);
}

/** Convenience flag for the immediate-badge renderer. */
export function isImmediate(neighbor: Neighbor, userZone: string | undefined): boolean {
  return Boolean(userZone) && neighbor.zone === userZone;
}
