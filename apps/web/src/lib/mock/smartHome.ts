// Mock devices, scenes, and utility meters for the Smart Home dashboard.
// Devices are scoped per property; meters too. Scene patches reference
// concrete device ids in this file — keep them in sync.

import type { SmartDevice, SmartScene, UtilityMeter } from '@/lib/schemas/smartHome';

export const MOCK_DEVICES: ReadonlyArray<SmartDevice> = [
  // ─── Villa 12 (prop-1) ──────────────────────────────────────────────
  // Living
  {
    id: 'dev-livAc',
    propertyId: 'prop-1',
    room: 'living',
    nameKey: 'smartHome.devices.livingAc',
    state: { kind: 'ac', on: true, targetC: 22, currentC: 24, mode: 'cool' },
  },
  {
    id: 'dev-livCeiling',
    propertyId: 'prop-1',
    room: 'living',
    nameKey: 'smartHome.devices.livingCeiling',
    state: { kind: 'light', on: true, brightness: 80 },
  },
  {
    id: 'dev-livBlinds',
    propertyId: 'prop-1',
    room: 'living',
    nameKey: 'smartHome.devices.livingBlinds',
    state: { kind: 'blinds', openPct: 60 },
  },

  // Kitchen
  {
    id: 'dev-kitPendants',
    propertyId: 'prop-1',
    room: 'kitchen',
    nameKey: 'smartHome.devices.kitchenPendants',
    state: { kind: 'light', on: true, brightness: 100 },
  },

  // Master bedroom
  {
    id: 'dev-mstAc',
    propertyId: 'prop-1',
    room: 'master',
    nameKey: 'smartHome.devices.masterAc',
    state: { kind: 'ac', on: false, targetC: 24, currentC: 26, mode: 'cool' },
  },
  {
    id: 'dev-mstBedlamp',
    propertyId: 'prop-1',
    room: 'master',
    nameKey: 'smartHome.devices.masterBedlamp',
    state: { kind: 'light', on: false, brightness: 30 },
  },
  {
    id: 'dev-mstLock',
    propertyId: 'prop-1',
    room: 'master',
    nameKey: 'smartHome.devices.masterLock',
    state: { kind: 'lock', locked: true },
  },

  // Kids' room
  {
    id: 'dev-kidsAc',
    propertyId: 'prop-1',
    room: 'kids',
    nameKey: 'smartHome.devices.kidsAc',
    state: { kind: 'ac', on: true, targetC: 24, currentC: 25, mode: 'cool' },
  },
  {
    id: 'dev-kidsNight',
    propertyId: 'prop-1',
    room: 'kids',
    nameKey: 'smartHome.devices.kidsNight',
    state: { kind: 'light', on: true, brightness: 30 },
  },

  // Guest
  {
    id: 'dev-guestLock',
    propertyId: 'prop-1',
    room: 'guest',
    nameKey: 'smartHome.devices.guestLock',
    state: { kind: 'lock', locked: true },
  },

  // Garden
  {
    id: 'dev-gardenLights',
    propertyId: 'prop-1',
    room: 'garden',
    nameKey: 'smartHome.devices.gardenLights',
    state: { kind: 'light', on: false, brightness: 70 },
  },

  // ─── Apt B-4-302 (prop-2) — leaner set ──────────────────────────────
  {
    id: 'dev-apt-livAc',
    propertyId: 'prop-2',
    room: 'living',
    nameKey: 'smartHome.devices.livingAc',
    state: { kind: 'ac', on: false, targetC: 23, currentC: 25, mode: 'cool' },
  },
  {
    id: 'dev-apt-livLight',
    propertyId: 'prop-2',
    room: 'living',
    nameKey: 'smartHome.devices.livingCeiling',
    state: { kind: 'light', on: false, brightness: 60 },
  },
  {
    id: 'dev-apt-mstAc',
    propertyId: 'prop-2',
    room: 'master',
    nameKey: 'smartHome.devices.masterAc',
    state: { kind: 'ac', on: false, targetC: 24, currentC: 25, mode: 'cool' },
  },
  {
    id: 'dev-apt-mstLock',
    propertyId: 'prop-2',
    room: 'master',
    nameKey: 'smartHome.devices.masterLock',
    state: { kind: 'lock', locked: true },
  },
  {
    id: 'dev-apt-water',
    propertyId: 'prop-2',
    room: 'kitchen',
    nameKey: 'smartHome.devices.waterHeater',
    state: { kind: 'water-heater', on: true, targetC: 60 },
  },

  // Chalet 18 (prop-3) is under-construction — no devices yet.
];

export const MOCK_SCENES: ReadonlyArray<SmartScene> = [
  {
    id: 'scene-welcome',
    nameKey: 'smartHome.scenes.welcome',
    emoji: '🏠',
    apply: [
      { deviceId: 'dev-livCeiling', patch: { on: true, brightness: 80 } },
      { deviceId: 'dev-kitPendants', patch: { on: true, brightness: 100 } },
      { deviceId: 'dev-livAc', patch: { on: true, targetC: 23 } },
      { deviceId: 'dev-livBlinds', patch: { openPct: 70 } },
      // Apt overrides
      { deviceId: 'dev-apt-livLight', patch: { on: true, brightness: 80 } },
      { deviceId: 'dev-apt-livAc', patch: { on: true, targetC: 23 } },
    ],
  },
  {
    id: 'scene-movie',
    nameKey: 'smartHome.scenes.movie',
    emoji: '🎬',
    apply: [
      { deviceId: 'dev-livCeiling', patch: { on: true, brightness: 20 } },
      { deviceId: 'dev-livBlinds', patch: { openPct: 0 } },
      { deviceId: 'dev-kitPendants', patch: { on: false } },
      // Apt
      { deviceId: 'dev-apt-livLight', patch: { on: true, brightness: 20 } },
    ],
  },
  {
    id: 'scene-sleep',
    nameKey: 'smartHome.scenes.sleep',
    emoji: '😴',
    apply: [
      { deviceId: 'dev-livCeiling', patch: { on: false } },
      { deviceId: 'dev-kitPendants', patch: { on: false } },
      { deviceId: 'dev-mstAc', patch: { on: true, targetC: 24 } },
      { deviceId: 'dev-mstBedlamp', patch: { on: true, brightness: 15 } },
      { deviceId: 'dev-mstLock', patch: { locked: true } },
      { deviceId: 'dev-kidsNight', patch: { on: true, brightness: 25 } },
      // Apt
      { deviceId: 'dev-apt-livLight', patch: { on: false } },
      { deviceId: 'dev-apt-mstAc', patch: { on: true, targetC: 24 } },
      { deviceId: 'dev-apt-mstLock', patch: { locked: true } },
    ],
  },
  {
    id: 'scene-away',
    nameKey: 'smartHome.scenes.away',
    emoji: '✈️',
    apply: [
      { deviceId: 'dev-livCeiling', patch: { on: false } },
      { deviceId: 'dev-kitPendants', patch: { on: false } },
      { deviceId: 'dev-livAc', patch: { on: false } },
      { deviceId: 'dev-mstAc', patch: { on: false } },
      { deviceId: 'dev-kidsAc', patch: { on: false } },
      { deviceId: 'dev-kidsNight', patch: { on: false } },
      { deviceId: 'dev-mstLock', patch: { locked: true } },
      { deviceId: 'dev-guestLock', patch: { locked: true } },
      { deviceId: 'dev-gardenLights', patch: { on: false } },
      // Apt
      { deviceId: 'dev-apt-livLight', patch: { on: false } },
      { deviceId: 'dev-apt-livAc', patch: { on: false } },
      { deviceId: 'dev-apt-mstAc', patch: { on: false } },
      { deviceId: 'dev-apt-mstLock', patch: { locked: true } },
      { deviceId: 'dev-apt-water', patch: { on: false } },
    ],
  },
];

export const MOCK_METERS: ReadonlyArray<UtilityMeter> = [
  {
    id: 'meter-elec-1',
    propertyId: 'prop-1',
    kind: 'electricity',
    thisMonth: 348,
    lastMonth: 412,
    liveDraw: 2.4,
    weekHistory: [12, 14, 18, 22, 19, 14, 11],
  },
  {
    id: 'meter-water-1',
    propertyId: 'prop-1',
    kind: 'water',
    thisMonth: 14.2,
    lastMonth: 16.8,
    liveDraw: 12,
    weekHistory: [0.5, 0.6, 0.7, 0.5, 0.4, 0.6, 0.5],
  },
  {
    id: 'meter-elec-2',
    propertyId: 'prop-2',
    kind: 'electricity',
    thisMonth: 192,
    lastMonth: 224,
    liveDraw: 0.8,
    weekHistory: [7, 8, 10, 11, 9, 8, 6],
  },
  {
    id: 'meter-water-2',
    propertyId: 'prop-2',
    kind: 'water',
    thisMonth: 6.4,
    lastMonth: 7.1,
    liveDraw: 0,
    weekHistory: [0.25, 0.3, 0.28, 0.22, 0.2, 0.22, 0.23],
  },
];
