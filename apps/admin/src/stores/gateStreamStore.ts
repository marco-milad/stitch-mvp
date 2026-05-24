// Live gate-scan stream store. The WS hub pushes events; this store holds
// the rolling buffer + connection flag. Stats (entries today, active
// guests, alerts) are derived in `useGateStats` from the same buffer so
// they're always coherent with what's on screen.
//
// IMPORTANT: keep selectors stable — never `.filter()`/`.map()` inside a
// `useStore((s) => …)` call. See [[feedback-zustand-selectors]].

import { create } from 'zustand';

import type { GateScanEvent } from '@/lib/types';

const MAX_EVENTS = 60;

interface GateStreamState {
  events: GateScanEvent[];
  connected: boolean;
  setSnapshot: (events: GateScanEvent[]) => void;
  pushEvent: (event: GateScanEvent) => void;
  setConnected: (open: boolean) => void;
}

export const useGateStreamStore = create<GateStreamState>((set, get) => ({
  events: [],
  connected: false,

  setSnapshot: (events) => {
    const trimmed = [...events]
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
      .slice(0, MAX_EVENTS);
    set({ events: trimmed });
  },

  pushEvent: (event) => {
    const existing = get().events;
    if (existing.some((e) => e.id === event.id)) return;
    const next = [event, ...existing].slice(0, MAX_EVENTS);
    set({ events: next });
  },

  setConnected: (open) => set({ connected: open }),
}));
