import { ChevronDown, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { ChipPicker, type ChipOption } from '@/components/ui/ChipPicker';
import { computePlan } from '@/lib/calculator';
import { formatEgp, formatNumber } from '@/lib/format';
import {
  AREA_RANGE,
  DOWN_PAYMENT_PCT_OPTIONS,
  PRICE_PER_M2,
  YEAR_OPTIONS,
  type DownPaymentPct,
  type PlanYears,
} from '@/lib/mock/calculator';
import { UNIT_TYPES } from '@/lib/mock/eoi';
import type { UnitType } from '@/lib/schemas/eoi';
import { useEoiStore } from '@/stores/eoiStore';

/**
 * Price calculator — Week 3 deliverable.
 * Inputs: unit type, area (m²), down payment %, plan years.
 * Outputs: total price, down payment, monthly installment, year-by-year breakdown.
 * All math is pure (apps/web/src/lib/calculator.ts) — recomputes on every render.
 */
export function DiscoverCalculator() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const setDraft = useEoiStore((s) => s.setDraft);

  const [unitType, setUnitType] = useState<UnitType>('apartment');
  const [areaM2, setAreaM2] = useState<number>(AREA_RANGE.apartment.default);
  const [downPaymentPct, setDownPaymentPct] = useState<DownPaymentPct>(20);
  const [years, setYears] = useState<PlanYears>(7);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Snap area to the new unit type's default whenever unit type changes.
  useEffect(() => {
    setAreaM2(AREA_RANGE[unitType].default);
  }, [unitType]);

  const range = AREA_RANGE[unitType];
  const plan = useMemo(
    () => computePlan({ unitType, areaM2, downPaymentPct, years }),
    [unitType, areaM2, downPaymentPct, years],
  );

  const dpOptions: ReadonlyArray<ChipOption<DownPaymentPct>> = DOWN_PAYMENT_PCT_OPTIONS.map(
    (v) => ({ value: v, label: `${formatNumber(v, i18n.language)}%` }),
  );
  const yearOptions: ReadonlyArray<ChipOption<PlanYears>> = YEAR_OPTIONS.map((v) => ({
    value: v,
    label: t('discover.calculator.years', { count: v }),
  }));

  const saveAndRegister = () => {
    setDraft({ interestedIn: unitType });
    navigate('/discover/eoi');
  };

  return (
    <div className="flex-1 flex flex-col bg-ink-50 dark:bg-ink-900">
      <Header />

      {/* Scrollable inputs */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Unit type */}
        <Field
          label={t('discover.calculator.fields.unitType')}
          hint={`${formatEgp(PRICE_PER_M2[unitType], i18n.language)} / ${t('discover.calculator.areaUnit')}`}
        >
          <ChipPicker
            options={UNIT_TYPES.map((o) => ({ value: o.value, labelKey: o.labelKey }))}
            value={unitType}
            onChange={setUnitType}
            ariaLabel={t('discover.calculator.fields.unitType')}
          />
        </Field>

        {/* Area slider */}
        <Field
          label={t('discover.calculator.fields.area')}
          hint={t('discover.calculator.areaRange', {
            min: formatNumber(range.min, i18n.language),
            max: formatNumber(range.max, i18n.language),
          })}
        >
          <div className="flex flex-row items-baseline gap-2 mb-2">
            <span className="text-2xl font-extrabold text-ink-900 dark:text-white tabular-nums">
              {formatNumber(areaM2, i18n.language)}
            </span>
            <span className="text-xs font-semibold text-ink-500 dark:text-ink-100">
              {t('discover.calculator.areaUnit')}
            </span>
          </div>
          <input
            type="range"
            min={range.min}
            max={range.max}
            step={5}
            value={areaM2}
            onChange={(e) => setAreaM2(Number(e.target.value))}
            aria-label={t('discover.calculator.fields.area')}
            className="w-full accent-brand-500 cursor-pointer"
            dir="ltr"
          />
        </Field>

        {/* Down payment */}
        <Field label={t('discover.calculator.fields.downPayment')}>
          <ChipPicker
            options={dpOptions}
            value={downPaymentPct}
            onChange={setDownPaymentPct}
            ariaLabel={t('discover.calculator.fields.downPayment')}
          />
        </Field>

        {/* Years */}
        <Field label={t('discover.calculator.fields.years')}>
          <ChipPicker
            options={yearOptions}
            value={years}
            onChange={setYears}
            ariaLabel={t('discover.calculator.fields.years')}
          />
        </Field>

        <p className="text-[11px] text-ink-500 dark:text-ink-100 italic">
          {t('discover.calculator.interestNote')}
        </p>

        {/* Breakdown */}
        <div>
          <button
            type="button"
            onClick={() => setShowBreakdown((s) => !s)}
            aria-expanded={showBreakdown ? 'true' : 'false'}
            className="flex flex-row items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400"
          >
            <ChevronDown
              size={14}
              className={showBreakdown ? 'rotate-180 transition-transform' : 'transition-transform'}
            />
            {showBreakdown
              ? t('discover.calculator.breakdownToggleHide')
              : t('discover.calculator.breakdownToggleShow')}
          </button>
          {showBreakdown && <BreakdownTable rows={plan.breakdown} />}
        </div>
      </div>

      {/* Sticky summary + CTA */}
      <SummaryCard plan={plan} onSave={saveAndRegister} />
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="flex flex-row items-center gap-3 px-4 py-3 border-b border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-900">
      <button
        type="button"
        onClick={() => navigate('/discover')}
        aria-label={t('discover.calculator.close')}
        className="p-2 -ms-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700"
      >
        <X size={22} className="text-ink-700 dark:text-white" />
      </button>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-bold text-ink-900 dark:text-white leading-tight">
          {t('discover.calculator.title')}
        </h2>
        <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">
          {t('discover.calculator.subtitle')}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex flex-row items-baseline justify-between mb-2">
        <h3 className="text-xs font-semibold text-ink-700 dark:text-ink-100">{label}</h3>
        {hint && (
          <span className="text-[11px] text-ink-500 dark:text-ink-100 tabular-nums">{hint}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function BreakdownTable({ rows }: { rows: ReturnType<typeof computePlan>['breakdown'] }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="mt-3 rounded-xl border border-ink-100 dark:border-ink-700 overflow-hidden">
      <div className="grid grid-cols-4 bg-ink-100 dark:bg-ink-700 text-[10px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-100">
        <span className="px-2 py-2">{t('discover.calculator.breakdown.year')}</span>
        <span className="px-2 py-2 text-end">{t('discover.calculator.breakdown.starting')}</span>
        <span className="px-2 py-2 text-end">{t('discover.calculator.breakdown.paid')}</span>
        <span className="px-2 py-2 text-end">{t('discover.calculator.breakdown.ending')}</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.year}
          className={[
            'grid grid-cols-4 text-xs tabular-nums',
            i % 2 === 0 ? 'bg-white dark:bg-ink-900' : 'bg-ink-50 dark:bg-ink-700/40',
          ].join(' ')}
        >
          <span className="px-2 py-2 font-semibold text-ink-900 dark:text-white">
            {formatNumber(r.year, i18n.language)}
          </span>
          <span className="px-2 py-2 text-end text-ink-700 dark:text-ink-100">
            {formatEgp(r.startingBalance, i18n.language)}
          </span>
          <span className="px-2 py-2 text-end text-brand-600 dark:text-brand-400">
            {formatEgp(r.yearlyPayment, i18n.language)}
          </span>
          <span className="px-2 py-2 text-end text-ink-700 dark:text-ink-100">
            {formatEgp(r.endingBalance, i18n.language)}
          </span>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({
  plan,
  onSave,
}: {
  plan: ReturnType<typeof computePlan>;
  onSave: () => void;
}) {
  const { t, i18n } = useTranslation();
  return (
    <div className="sticky bottom-0 bg-white dark:bg-ink-900 border-t border-ink-100 dark:border-ink-700 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] px-4 pt-3 pb-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Kpi
          label={t('discover.calculator.summary.totalPrice')}
          value={formatEgp(plan.totalPrice, i18n.language)}
          emphasis
        />
        <Kpi
          label={t('discover.calculator.summary.downPayment')}
          value={formatEgp(plan.downPayment, i18n.language)}
        />
        <Kpi
          label={t('discover.calculator.summary.monthly')}
          value={formatEgp(plan.monthlyInstallment, i18n.language)}
          emphasis
        />
        <Kpi
          label={t('discover.calculator.summary.installments')}
          value={formatNumber(plan.totalMonths, i18n.language)}
        />
      </div>
      <button
        type="button"
        onClick={onSave}
        className="w-full bg-brand-500 rounded-xl py-3 text-white font-semibold text-sm"
      >
        {t('discover.calculator.save')}
      </button>
    </div>
  );
}

function Kpi({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div
      className={[
        'rounded-xl px-3 py-2',
        emphasis
          ? 'bg-brand-50 dark:bg-brand-700/30 border border-brand-100 dark:border-brand-700'
          : 'bg-ink-50 dark:bg-ink-700/40 border border-ink-100 dark:border-ink-700',
      ].join(' ')}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-100">
        {label}
      </p>
      <p
        className={[
          'mt-0.5 font-extrabold tabular-nums truncate',
          emphasis
            ? 'text-base text-brand-700 dark:text-brand-400'
            : 'text-sm text-ink-900 dark:text-white',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  );
}
