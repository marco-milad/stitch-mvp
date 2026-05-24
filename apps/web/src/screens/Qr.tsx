import { Camera, RefreshCw, Sun, UserPlus, X, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { CountdownRing } from '@/components/qr/CountdownRing';
import { QrPattern } from '@/components/qr/QrPattern';
import { QR_LOG_ICON, QR_LOG_TONE, QR_LOGS } from '@/lib/mock/activities';
import { colors } from '@/lib/theme';
import { useProfileStore } from '@/stores/profileStore';

const QR_ROTATE_MS = 30_000;
const QR_SIZE = 240;
const MOCK_UNIT = { name: 'Villa 12', project: 'New Cairo' };

export function Qr() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const brightnessBoost = useProfileStore((s) => s.brightnessBoost);
  const toggleBrightness = useProfileStore((s) => s.toggleBrightness);

  const refresh = () => setSeed(Math.floor(Math.random() * 1e9));

  return (
    <div
      className={`flex-1 flex flex-col ${brightnessBoost ? 'bg-white' : 'bg-ink-50 dark:bg-ink-900'}`}
    >
      <div className="flex flex-row items-center justify-between px-4 py-3 border-b border-ink-100 dark:border-ink-700">
        <h2 className="text-xl font-semibold text-ink-900 dark:text-white">{t('qr.title')}</h2>
        <button type="button" onClick={() => navigate(-1)} aria-label="Close" className="p-2">
          <X color={colors.ink[700]} size={22} />
        </button>
      </div>

      <div className="p-4 pb-16 overflow-y-auto">
        <p className="text-center text-xs text-ink-500 dark:text-ink-100 mb-2">
          Show this at the gate · {MOCK_UNIT.name} · {MOCK_UNIT.project}
        </p>

        <div className="flex flex-col items-center justify-center my-3">
          <CountdownRing
            durationMs={QR_ROTATE_MS}
            size={QR_SIZE + 24}
            thickness={4}
            onTick={refresh}
          >
            <QrPattern seed={seed} size={QR_SIZE} brightness={brightnessBoost} />
          </CountdownRing>
          <p className="mt-3 text-[11px] text-ink-500 dark:text-ink-100">
            Rotates every 30 seconds for security
          </p>
        </div>

        <div className="flex flex-row gap-2 mb-5">
          <QuickAction
            Icon={UserPlus}
            label="Invite"
            tone="#7C3AED"
            bg="#EDE9FE"
            onClick={() =>
              window.alert('Invite guest\n\nComing in Week 2 — guest pass generation flow.')
            }
          />
          <QuickAction
            Icon={RefreshCw}
            label="Refresh"
            tone="#06B6D4"
            bg="#CFFAFE"
            onClick={refresh}
          />
          <QuickAction
            Icon={Sun}
            label={brightnessBoost ? 'Boosted' : 'Brightness'}
            tone={brightnessBoost ? '#F59E0B' : '#94A3B8'}
            bg={brightnessBoost ? '#FEF3C7' : '#F1F5F9'}
            onClick={toggleBrightness}
          />
        </div>

        <div className="flex flex-row items-center justify-between mb-2">
          <h3 className="text-base font-bold text-ink-900 dark:text-white">{t('qr.activity')}</h3>
          <button
            type="button"
            onClick={() => window.alert('Activity log\n\nFull log lands in Week 2.')}
          >
            <span className="text-xs font-semibold text-brand-500">See all</span>
          </button>
        </div>

        <div className="bg-white dark:bg-ink-700 rounded-2xl overflow-hidden border border-ink-100 dark:border-ink-700">
          {QR_LOGS.map((entry, i) => {
            const Icon = QR_LOG_ICON[entry.kind];
            const tone = QR_LOG_TONE[entry.kind];
            return (
              <div
                key={entry.id}
                className={`flex flex-row items-center px-4 py-3 ${
                  i < QR_LOGS.length - 1 ? 'border-b border-ink-100 dark:border-ink-700' : ''
                }`}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mr-3 flex-shrink-0"
                  style={{ backgroundColor: tone.bg }}
                >
                  <Icon color={tone.fg} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900 dark:text-white truncate">
                    {tone.label} — {entry.who}
                  </p>
                  <p className="text-[11px] text-ink-500 dark:text-ink-100">
                    {entry.gate} · {entry.when} · {entry.method.toUpperCase()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => window.alert(`${t('qr.scan')}\n\nCamera scanning lands in Week 2.`)}
          className="mt-4 w-full flex flex-row items-center justify-center bg-ink-900 dark:bg-ink-700 rounded-2xl py-3 text-white font-semibold"
        >
          <Camera color="#fff" size={18} />
          <span className="ml-2">{t('qr.scan')}</span>
        </button>
      </div>
    </div>
  );
}

function QuickAction({
  Icon,
  label,
  tone,
  bg,
  onClick,
}: {
  Icon: LucideIcon;
  label: string;
  tone: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex-1 flex flex-col items-center bg-white dark:bg-ink-700 rounded-2xl py-3 border border-ink-100 dark:border-ink-700 active:scale-95 transition-transform"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
        style={{ backgroundColor: bg }}
      >
        <Icon color={tone} size={20} />
      </div>
      <span className="text-xs font-semibold text-ink-900 dark:text-white">{label}</span>
    </button>
  );
}
