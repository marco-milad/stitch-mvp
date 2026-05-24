// Price-calculator reference data for the Discover prospect flow.
// Numbers are placeholder values for the Madinet Masr brochure; swap for
// API-driven per-zone pricing once apps/api exposes /api/v1/discover/pricing.

import type { UnitType } from '@/lib/schemas/eoi';

/** Base price per m² in EGP. */
export const PRICE_PER_M2: Record<UnitType, number> = {
  villa: 85_000,
  townhouse: 60_000,
  apartment: 40_000,
  studio: 38_000,
};

/** Slider bounds + sensible default per unit type. */
export const AREA_RANGE: Record<UnitType, { min: number; max: number; default: number }> = {
  villa: { min: 250, max: 600, default: 350 },
  townhouse: { min: 180, max: 320, default: 220 },
  apartment: { min: 80, max: 220, default: 130 },
  studio: { min: 40, max: 90, default: 55 },
};

export const DOWN_PAYMENT_PCT_OPTIONS = [10, 20, 30, 40] as const;
export const YEAR_OPTIONS = [5, 7, 10] as const;

export type DownPaymentPct = (typeof DOWN_PAYMENT_PCT_OPTIONS)[number];
export type PlanYears = (typeof YEAR_OPTIONS)[number];
