// Smart-home dashboard state. Devices + meters persist to localStorage so
// resident interactions survive reloads (toggling a light, sliding AC temp,
// applying a scene). Scenes themselves are static.
//
// Selector rule [[feedback-zustand-selectors]]: never do `.filter()` /
// `.map()` inside a Zustand selector — returns a new reference and triggers
// an infinite render loop. Select raw arrays, derive with useMemo.

import { useMemo } from 'react';
import { create } from 'zustand';

import { MOCK_DEVICES, MOCK_METERS, MOCK_SCENES } from '@/lib/mock/smartHome';
import type {
  DeviceState,
  DevicePatch,
  SmartDevice,
  SmartScene,
  UtilityMeter,
} from '@/lib/schemas/smartHome';
import { usePropertyStore } from '@/stores/propertyStore';

const STORAGE_KEY = 'stitch.smartHome';

interface PersistedShape {
  devices: SmartDevice[];
  meters: UtilityMeter[];
}

function loadPersisted(): PersistedShape {
  if (typeof localStorage === 'undefined') {
    return { devices: [...MOCK_DEVICES], meters: [...MOCK_METERS] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { devices: [...MOCK_DEVICES], meters: [...MOCK_METERS] };
    const parsed = JSON.parse(raw) as PersistedShape;
    if (!parsed?.devices || !parsed?.meters) {
      return { devices: [...MOCK_DEVICES], meters: [...MOCK_METERS] };
    }
    return parsed;
  } catch {
    return { devices: [...MOCK_DEVICES], meters: [...MOCK_METERS] };
  }
}

function persist(state: PersistedShape): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota / private mode — silent
  }
}

interface SmartHomeState {
  devices: SmartDevice[];
  scenes: ReadonlyArray<SmartScene>;
  meters: UtilityMeter[];
  toggleDevice: (id: string) => void;
  patchDeviceState: (id: string, patch: DevicePatch) => void;
  applyScene: (sceneId: string) => void;
  tickMeters: () => void;
}

/** Merge a patch into a device's state, narrowing safely on `kind`. */
function applyPatch(state: DeviceState, patch: DevicePatch): DeviceState {
  switch (state.kind) {
    case 'ac':
      return {
        ...state,
        on: patch.on ?? state.on,
        targetC: patch.targetC ?? state.targetC,
        mode: patch.mode ?? state.mode,
      };
    case 'light':
      return {
        ...state,
        on: patch.on ?? state.on,
        brightness: patch.brightness ?? state.brightness,
      };
    case 'lock':
      return { ...state, locked: patch.locked ?? state.locked };
    case 'blinds':
      return { ...state, openPct: patch.openPct ?? state.openPct };
    case 'water-heater':
      return {
        ...state,
        on: patch.on ?? state.on,
        targetC: patch.targetC ?? state.targetC,
      };
  }
}

/** Flip the "on" / "locked" toggle for any switchable device. */
function togglePrimary(state: DeviceState): DeviceState {
  switch (state.kind) {
    case 'ac':
    case 'light':
    case 'water-heater':
      return { ...state, on: !state.on };
    case 'lock':
      return { ...state, locked: !state.locked };
    case 'blinds':
      // No binary toggle for blinds — snap between fully open and fully closed.
      return { ...state, openPct: state.openPct > 50 ? 0 : 100 };
  }
}

export const useSmartHomeStore = create<SmartHomeState>((set, get) => ({
  devices: loadPersisted().devices,
  scenes: MOCK_SCENES,
  meters: loadPersisted().meters,

  toggleDevice: (id) => {
    const next = get().devices.map((d) =>
      d.id === id ? { ...d, state: togglePrimary(d.state) } : d,
    );
    persist({ devices: next, meters: get().meters });
    set({ devices: next });
  },

  patchDeviceState: (id, patch) => {
    const next = get().devices.map((d) =>
      d.id === id ? { ...d, state: applyPatch(d.state, patch) } : d,
    );
    persist({ devices: next, meters: get().meters });
    set({ devices: next });
  },

  applyScene: (sceneId) => {
    const scene = get().scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    const patchById = new Map(scene.apply.map((a) => [a.deviceId, a.patch]));
    const next = get().devices.map((d) => {
      const patch = patchById.get(d.id);
      return patch ? { ...d, state: applyPatch(d.state, patch) } : d;
    });
    persist({ devices: next, meters: get().meters });
    set({ devices: next });
  },

  // Small random-walk perturbation for the live-draw readout — gives the
  // dashboard a sense of being alive without faking real telemetry.
  tickMeters: () => {
    const meters = get().meters.map((m) => {
      const drift = (Math.random() - 0.5) * 0.1; // ±5% step
      const liveDraw = clampPositive(m.liveDraw * (1 + drift));
      const increment = m.kind === 'electricity' ? liveDraw * 0.001 : liveDraw * 0.0005;
      return {
        ...m,
        liveDraw: round(liveDraw, m.kind === 'electricity' ? 2 : 1),
        thisMonth: round(m.thisMonth + increment, m.kind === 'electricity' ? 1 : 2),
      };
    });
    persist({ devices: get().devices, meters });
    set({ meters });
  },
}));

function clampPositive(n: number): number {
  return n < 0 ? 0 : n;
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

// ─── Selectors ─────────────────────────────────────────────────────────

/** Devices scoped to the current property. */
export function useDevicesForCurrentProperty(): SmartDevice[] {
  const propertyId = usePropertyStore((s) => s.currentPropertyId);
  const devices = useSmartHomeStore((s) => s.devices);
  return useMemo(() => devices.filter((d) => d.propertyId === propertyId), [devices, propertyId]);
}

/** Meters scoped to the current property. */
export function useMetersForCurrentProperty(): UtilityMeter[] {
  const propertyId = usePropertyStore((s) => s.currentPropertyId);
  const meters = useSmartHomeStore((s) => s.meters);
  return useMemo(() => meters.filter((m) => m.propertyId === propertyId), [meters, propertyId]);
}
