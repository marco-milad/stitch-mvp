import { Droplets, Zap, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { formatNumber } from '@/lib/format';
import type { UtilityMeter } from '@/lib/schemas/smartHome';

interface Props {
  meter: UtilityMeter;
}

/**
 * Single-meter card: live instantaneous draw (large), this-month running
 * total, trend-vs-last-month chip, and a 7-bar SVG sparkline. The
 * dashboard mounts two side-by-side (electricity + water).
 */
export function MeterCard({ meter }: Props) {
  const { t, i18n } = useTranslation();
  const isElec = meter.kind === 'electricity';
  const Icon: LucideIcon = isElec ? Zap : Droplets;
  const tint = isElec ? '#F59E0B' : '#0EA5E9';

  // Trend: % delta vs last month — clamp ±99% to avoid silly readings.
  const delta = meter.lastMonth === 0 ? 0 : (meter.thisMonth - meter.lastMonth) / meter.lastMonth;
  const pct = Math.min(99, Math.round(Math.abs(delta) * 100));
  const trendKey =
    pct < 2
      ? 'smartHome.live.trendFlat'
      : delta > 0
        ? 'smartHome.live.trendUp'
        : 'smartHome.live.trendDown';
  const trendColor = pct < 2 ? '#64748B' : delta > 0 ? '#DC2626' : '#059669';

  const liveLabel = isElec ? 'kW' : 'L/min';
  const totalLabel = isElec ? 'kWh' : 'm³';

  return (
    <div className="flex-1 bg-white dark:bg-ink-700 rounded-2xl p-3 border border-ink-100 dark:border-ink-700">
      <div className="flex flex-row items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: tint }}
        >
          <Icon size={14} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-ink-500">
          {t(`smartHome.live.${meter.kind}`)}
        </span>
      </div>

      {/* Live value */}
      <div className="flex flex-row items-baseline gap-1 tabular-nums">
        <span className="text-2xl font-extrabold text-ink-900 dark:text-white" dir="ltr">
          {formatNumber(meter.liveDraw, i18n.language)}
        </span>
        <span className="text-[11px] font-semibold text-ink-500 dark:text-ink-100">
          {liveLabel}
        </span>
        <PulseDot />
      </div>

      {/* This-month total */}
      <p className="mt-1 text-[11px] text-ink-500 dark:text-ink-100 tabular-nums">
        {t('smartHome.live.thisMonth')}:{' '}
        <span className="font-semibold text-ink-900 dark:text-white" dir="ltr">
          {formatNumber(meter.thisMonth, i18n.language)} {totalLabel}
        </span>
      </p>

      {/* Trend */}
      <p className="mt-0.5 text-[10px] font-semibold tabular-nums" style={{ color: trendColor }}>
        {t(trendKey, { pct })}
      </p>

      {/* Sparkline */}
      <div className="mt-2">
        <Sparkline values={meter.weekHistory} tint={tint} />
      </div>
    </div>
  );
}

function PulseDot() {
  return (
    <span className="relative inline-flex w-2 h-2 ms-1">
      <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
      <span className="relative w-2 h-2 rounded-full bg-emerald-500" />
    </span>
  );
}

/** 7-bar mini chart — pure SVG, no chart library. */
function Sparkline({ values, tint }: { values: number[]; tint: string }) {
  const max = Math.max(...values, 1);
  const w = 100;
  const h = 24;
  const barW = w / values.length;
  const gap = barW * 0.25;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-6" aria-hidden>
      {values.map((v, i) => {
        const barH = (v / max) * h;
        return (
          <rect
            key={i}
            x={i * barW + gap / 2}
            y={h - barH}
            width={barW - gap}
            height={barH}
            rx={1}
            fill={tint}
            opacity={i === values.length - 1 ? 1 : 0.4}
          />
        );
      })}
    </svg>
  );
}
