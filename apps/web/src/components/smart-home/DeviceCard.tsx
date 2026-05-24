import {
  Blinds,
  Fan,
  Lightbulb,
  Lock,
  LockOpen,
  Power,
  Thermometer,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { DeviceKind, DeviceState, SmartDevice } from '@/lib/schemas/smartHome';
import { useSmartHomeStore } from '@/stores/smartHomeStore';

interface Props {
  device: SmartDevice;
}

const KIND_ICON: Record<DeviceKind, LucideIcon> = {
  ac: Fan,
  light: Lightbulb,
  lock: Lock,
  blinds: Blinds,
  'water-heater': Thermometer,
};

const KIND_TINT: Record<DeviceKind, { dot: string; chip: string }> = {
  ac: { dot: '#06B6D4', chip: '#CFFAFE' },
  light: { dot: '#F59E0B', chip: '#FEF3C7' },
  lock: { dot: '#7C3AED', chip: '#EDE9FE' },
  blinds: { dot: '#475569', chip: '#E2E8F0' },
  'water-heater': { dot: '#EA580C', chip: '#FFEDD5' },
};

/**
 * One device card. Dispatches the body to a kind-specific renderer
 * (AC slider, light dimmer, lock toggle, blinds slider, water-heater).
 */
export function DeviceCard({ device }: Props) {
  const { t } = useTranslation();
  const Icon = KIND_ICON[device.state.kind];
  const tint = KIND_TINT[device.state.kind];

  return (
    <div className="bg-white dark:bg-ink-700 rounded-2xl p-3 border border-ink-100 dark:border-ink-700">
      <div className="flex flex-row items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: tint.chip, color: tint.dot }}
        >
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-ink-900 dark:text-white truncate">
            {t(device.nameKey)}
          </p>
          <StatusLine state={device.state} />
        </div>
      </div>
      <Body device={device} />
    </div>
  );
}

// ─── Status line per kind ──────────────────────────────────────────────

function StatusLine({ state }: { state: DeviceState }) {
  const { t } = useTranslation();
  switch (state.kind) {
    case 'ac': {
      const label = !state.on
        ? t('smartHome.controls.off')
        : state.mode === 'cool'
          ? t('smartHome.controls.cooling')
          : state.mode === 'heat'
            ? t('smartHome.controls.heating')
            : t('smartHome.controls.idle');
      return <p className="text-[10px] text-ink-500 dark:text-ink-100">{label}</p>;
    }
    case 'light':
      return (
        <p className="text-[10px] text-ink-500 dark:text-ink-100">
          {state.on ? `${state.brightness}%` : t('smartHome.controls.off')}
        </p>
      );
    case 'lock':
      return (
        <p className="text-[10px] text-ink-500 dark:text-ink-100">
          {state.locked ? t('smartHome.controls.locked') : t('smartHome.controls.unlocked')}
        </p>
      );
    case 'blinds':
      return <p className="text-[10px] text-ink-500 dark:text-ink-100">{state.openPct}%</p>;
    case 'water-heater':
      return (
        <p className="text-[10px] text-ink-500 dark:text-ink-100">
          {state.on ? `${state.targetC}°C` : t('smartHome.controls.off')}
        </p>
      );
  }
}

// ─── Body — kind-specific controls ─────────────────────────────────────

function Body({ device }: { device: SmartDevice }) {
  switch (device.state.kind) {
    case 'ac':
      return <AcBody device={device} state={device.state} />;
    case 'light':
      return <LightBody device={device} state={device.state} />;
    case 'lock':
      return <LockBody device={device} state={device.state} />;
    case 'blinds':
      return <BlindsBody device={device} state={device.state} />;
    case 'water-heater':
      return <WaterHeaterBody device={device} state={device.state} />;
  }
}

function AcBody({
  device,
  state,
}: {
  device: SmartDevice;
  state: Extract<DeviceState, { kind: 'ac' }>;
}) {
  const toggle = useSmartHomeStore((s) => s.toggleDevice);
  const patch = useSmartHomeStore((s) => s.patchDeviceState);
  return (
    <>
      <div className="flex flex-row items-baseline gap-1 mb-2 tabular-nums">
        <span
          className={[
            'text-2xl font-extrabold',
            state.on ? 'text-ink-900 dark:text-white' : 'text-ink-400',
          ].join(' ')}
          dir="ltr"
        >
          {state.targetC}
        </span>
        <span className="text-xs font-semibold text-ink-500 dark:text-ink-100">°C</span>
      </div>
      <input
        type="range"
        min={16}
        max={30}
        value={state.targetC}
        disabled={!state.on}
        onChange={(e) => patch(device.id, { targetC: Number(e.target.value) })}
        dir="ltr"
        aria-label="Target temperature"
        className="w-full accent-brand-500 disabled:opacity-40"
      />
      <PowerButton on={state.on} onClick={() => toggle(device.id)} />
    </>
  );
}

function LightBody({
  device,
  state,
}: {
  device: SmartDevice;
  state: Extract<DeviceState, { kind: 'light' }>;
}) {
  const toggle = useSmartHomeStore((s) => s.toggleDevice);
  const patch = useSmartHomeStore((s) => s.patchDeviceState);
  return (
    <>
      <input
        type="range"
        min={0}
        max={100}
        value={state.brightness}
        disabled={!state.on}
        onChange={(e) => patch(device.id, { brightness: Number(e.target.value) })}
        dir="ltr"
        aria-label="Brightness"
        className="w-full accent-amber-500 disabled:opacity-40 mb-2"
      />
      <PowerButton on={state.on} onClick={() => toggle(device.id)} />
    </>
  );
}

function LockBody({
  device,
  state,
}: {
  device: SmartDevice;
  state: Extract<DeviceState, { kind: 'lock' }>;
}) {
  const toggle = useSmartHomeStore((s) => s.toggleDevice);
  const { t } = useTranslation();
  const Icon = state.locked ? Lock : LockOpen;
  return (
    <button
      type="button"
      onClick={() => toggle(device.id)}
      className={[
        'w-full inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors',
        state.locked
          ? 'bg-violet-500 text-white hover:bg-violet-600'
          : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
      ].join(' ')}
    >
      <Icon size={14} />
      <span>
        {state.locked ? t('smartHome.controls.locked') : t('smartHome.controls.unlocked')}
      </span>
    </button>
  );
}

function BlindsBody({
  device,
  state,
}: {
  device: SmartDevice;
  state: Extract<DeviceState, { kind: 'blinds' }>;
}) {
  const patch = useSmartHomeStore((s) => s.patchDeviceState);
  return (
    <input
      type="range"
      min={0}
      max={100}
      value={state.openPct}
      onChange={(e) => patch(device.id, { openPct: Number(e.target.value) })}
      dir="ltr"
      aria-label="Open percentage"
      className="w-full accent-slate-500 mb-1"
    />
  );
}

function WaterHeaterBody({
  device,
  state,
}: {
  device: SmartDevice;
  state: Extract<DeviceState, { kind: 'water-heater' }>;
}) {
  const toggle = useSmartHomeStore((s) => s.toggleDevice);
  const patch = useSmartHomeStore((s) => s.patchDeviceState);
  return (
    <>
      <div className="flex flex-row items-baseline gap-1 mb-2 tabular-nums">
        <span
          className={[
            'text-2xl font-extrabold',
            state.on ? 'text-ink-900 dark:text-white' : 'text-ink-400',
          ].join(' ')}
          dir="ltr"
        >
          {state.targetC}
        </span>
        <span className="text-xs font-semibold text-ink-500 dark:text-ink-100">°C</span>
      </div>
      <input
        type="range"
        min={35}
        max={75}
        value={state.targetC}
        disabled={!state.on}
        onChange={(e) => patch(device.id, { targetC: Number(e.target.value) })}
        dir="ltr"
        aria-label="Target temperature"
        className="w-full accent-orange-500 disabled:opacity-40"
      />
      <PowerButton on={state.on} onClick={() => toggle(device.id)} />
    </>
  );
}

function PowerButton({ on, onClick }: { on: boolean; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on ? 'true' : 'false'}
      className={[
        'mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-[11px] font-semibold transition-colors',
        on
          ? 'bg-brand-500 text-white hover:bg-brand-600'
          : 'bg-ink-100 dark:bg-ink-900 text-ink-700 dark:text-ink-100',
      ].join(' ')}
    >
      <Power size={12} />
      <span>{on ? t('smartHome.controls.on') : t('smartHome.controls.off')}</span>
    </button>
  );
}
