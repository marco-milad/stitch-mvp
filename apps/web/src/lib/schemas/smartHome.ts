// Smart-home dashboard types — devices (discriminated by state.kind),
// scenes (sparse patches applied to many devices at once), and utility
// meters (live instantaneous draw + monthly totals + week sparkline).
// All state is mock + persisted to localStorage; the real Matter/Tuya
// bridge is Phase 4+ territory.

import { z } from 'zod';

export const ROOM_VALUES = ['living', 'kitchen', 'master', 'kids', 'guest', 'garden'] as const;
export type Room = (typeof ROOM_VALUES)[number];

export const AC_MODE_VALUES = ['cool', 'heat', 'auto'] as const;
export type AcMode = (typeof AC_MODE_VALUES)[number];

// Discriminated union — each kind has its own state shape.
export const deviceStateSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('ac'),
    on: z.boolean(),
    targetC: z.number().int().min(16).max(30),
    currentC: z.number(),
    mode: z.enum(AC_MODE_VALUES),
  }),
  z.object({
    kind: z.literal('light'),
    on: z.boolean(),
    brightness: z.number().int().min(0).max(100),
  }),
  z.object({
    kind: z.literal('lock'),
    locked: z.boolean(),
  }),
  z.object({
    kind: z.literal('blinds'),
    openPct: z.number().int().min(0).max(100),
  }),
  z.object({
    kind: z.literal('water-heater'),
    on: z.boolean(),
    targetC: z.number().int().min(35).max(75),
  }),
]);
export type DeviceState = z.infer<typeof deviceStateSchema>;
export type DeviceKind = DeviceState['kind'];

export interface SmartDevice {
  id: string;
  propertyId: string;
  room: Room;
  nameKey: string;
  state: DeviceState;
}

/** Permissive patch shape — every property a scene might want to nudge.
 *  Runtime safety: applyScene only merges into matching devices. */
export interface DevicePatch {
  on?: boolean;
  targetC?: number;
  brightness?: number;
  openPct?: number;
  locked?: boolean;
  mode?: AcMode;
}

export interface SmartScene {
  id: string;
  nameKey: string;
  emoji: string;
  apply: ReadonlyArray<{ deviceId: string; patch: DevicePatch }>;
}

export type MeterKind = 'electricity' | 'water';

export interface UtilityMeter {
  id: string;
  propertyId: string;
  kind: MeterKind;
  /** Running total since the 1st of the current month. */
  thisMonth: number;
  /** Prior-month total — for the "vs last month" trend chip. */
  lastMonth: number;
  /** Current instantaneous draw — electricity kW, water L/min. */
  liveDraw: number;
  /** 7 hand-tuned daily samples (most-recent last) for the sparkline. */
  weekHistory: number[];
}
