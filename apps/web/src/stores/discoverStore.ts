// In-memory state for the Discover tab — selected master-plan zone and
// the current virtual-tour stop index. Resets on reload.
// Week 2: persist last-visited stop to localStorage so prospects can resume.

import { create } from 'zustand';

interface DiscoverState {
  selectedZoneId: string | null;
  currentTourStopIndex: number;
  selectedHotspotId: string | null;
  // Lifestyle stories — kept separate from feedStore.viewedStories because
  // Discover and Community are distinct content domains.
  viewedStoryIds: ReadonlySet<string>;
  selectZone: (id: string | null) => void;
  setTourStopIndex: (index: number) => void;
  selectHotspot: (id: string | null) => void;
  markStoryViewed: (id: string) => void;
  resetTour: () => void;
}

export const useDiscoverStore = create<DiscoverState>((set) => ({
  selectedZoneId: null,
  currentTourStopIndex: 0,
  selectedHotspotId: null,
  viewedStoryIds: new Set(),
  selectZone: (id) => set({ selectedZoneId: id }),
  // Changing stops clears the open hotspot — old coords don't map to the new stage.
  setTourStopIndex: (index) =>
    set({ currentTourStopIndex: Math.max(0, index), selectedHotspotId: null }),
  selectHotspot: (id) => set({ selectedHotspotId: id }),
  markStoryViewed: (id) =>
    set((s) => {
      if (s.viewedStoryIds.has(id)) return s;
      const next = new Set(s.viewedStoryIds);
      next.add(id);
      return { viewedStoryIds: next };
    }),
  resetTour: () => set({ currentTourStopIndex: 0, selectedHotspotId: null }),
}));
