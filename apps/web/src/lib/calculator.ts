// Pure payment-plan math. Zero-interest assumption matches the way
// Egyptian developers typically structure plans. Keep this file dependency-free
// (no React, no i18n) so it stays unit-testable.

import { PRICE_PER_M2, type DownPaymentPct, type PlanYears } from '@/lib/mock/calculator';
import type { UnitType } from '@/lib/schemas/eoi';

export interface PlanInput {
  unitType: UnitType;
  areaM2: number;
  downPaymentPct: DownPaymentPct;
  years: PlanYears;
}

export interface YearBreakdown {
  year: number;
  startingBalance: number;
  yearlyPayment: number;
  endingBalance: number;
}

export interface PlanSummary {
  totalPrice: number;
  downPayment: number;
  remainingBalance: number;
  totalMonths: number;
  monthlyInstallment: number;
  breakdown: YearBreakdown[];
}

export function computePlan({ unitType, areaM2, downPaymentPct, years }: PlanInput): PlanSummary {
  const totalPrice = PRICE_PER_M2[unitType] * areaM2;
  const downPayment = (totalPrice * downPaymentPct) / 100;
  const remainingBalance = totalPrice - downPayment;
  const totalMonths = years * 12;
  const monthlyInstallment = totalMonths === 0 ? 0 : remainingBalance / totalMonths;
  const yearlyPayment = monthlyInstallment * 12;

  const breakdown: YearBreakdown[] = [];
  let runningBalance = remainingBalance;
  for (let i = 1; i <= years; i += 1) {
    const startingBalance = runningBalance;
    // Last year absorbs any rounding drift so the table sums exactly.
    const payment = i === years ? startingBalance : yearlyPayment;
    runningBalance = startingBalance - payment;
    breakdown.push({
      year: i,
      startingBalance,
      yearlyPayment: payment,
      endingBalance: runningBalance,
    });
  }

  return {
    totalPrice,
    downPayment,
    remainingBalance,
    totalMonths,
    monthlyInstallment,
    breakdown,
  };
}
