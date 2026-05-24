import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { DeviceCard } from '@/components/smart-home/DeviceCard';
import { MeterCard } from '@/components/smart-home/MeterCard';
import { SceneChip } from '@/components/smart-home/SceneChip';
import { ROOM_VALUES, type Room, type SmartDevice } from '@/lib/schemas/smartHome';
import { useCurrentProperty } from '@/stores/propertyStore';
import {
  useDevicesForCurrentProperty,
  useMetersForCurrentProperty,
  useSmartHomeStore,
} from '@/stores/smartHomeStore';

const METER_TICK_MS = 3000;

export function ServiceSmartHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const property = useCurrentProperty();
  const devices = useDevicesForCurrentProperty();
  const meters = useMetersForCurrentProperty();
  const scenes = useSmartHomeStore((s) => s.scenes);
  const applyScene = useSmartHomeStore((s) => s.applyScene);
  const tickMeters = useSmartHomeStore((s) => s.tickMeters);

  // 3-second pulse keeps the live-draw readouts feeling alive.
  useEffect(() => {
    if (meters.length === 0) return;
    const id = setInterval(() => tickMeters(), METER_TICK_MS);
    return () => clearInterval(id);
  }, [meters.length, tickMeters]);

  // Group devices by room in display order; rooms with no devices are skipped.
  const devicesByRoom = useMemo(() => {
    const map = new Map<Room, SmartDevice[]>();
    for (const room of ROOM_VALUES) map.set(room, []);
    for (const d of devices) map.get(d.room)!.push(d);
    return ROOM_VALUES.flatMap((room) => {
      const list = map.get(room) ?? [];
      return list.length > 0 ? [{ room, list }] : [];
    });
  }, [devices]);

  const subtitle = property
    ? `${property.unitName} · ${property.compoundName}`
    : t('smartHome.subtitle');

  return (
    <>
      <div className="bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-700">
        <div className="flex flex-row items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/services')}
            aria-label={t('smartHome.back')}
            className="p-2 -ms-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700"
          >
            <ArrowLeft size={22} className="text-ink-700 dark:text-white rtl:rotate-180" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-ink-900 dark:text-white leading-tight">
              {t('smartHome.title')}
            </h1>
            <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Live meters */}
        {meters.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
              {t('smartHome.live.title')}
            </h3>
            <div className="flex flex-row gap-2">
              {meters.map((m) => (
                <MeterCard key={m.id} meter={m} />
              ))}
            </div>
          </section>
        )}

        {/* Scenes — only when there's something to apply against */}
        {devices.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
              {t('smartHome.scenes.title')}
            </h3>
            <div className="-mx-1 px-1 flex flex-row gap-2 overflow-x-auto no-scrollbar">
              {scenes.map((scene) => (
                <SceneChip key={scene.id} scene={scene} onApply={() => applyScene(scene.id)} />
              ))}
            </div>
          </section>
        )}

        {/* Devices grouped by room */}
        {devices.length === 0 ? (
          <p className="text-sm text-ink-500 dark:text-ink-100 text-center mt-6">
            {t('smartHome.emptyDevices')}
          </p>
        ) : (
          devicesByRoom.map(({ room, list }) => (
            <section key={room} className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
                {t(`smartHome.rooms.${room}`)}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {list.map((d) => (
                  <DeviceCard key={d.id} device={d} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
