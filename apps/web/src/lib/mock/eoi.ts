// EOI form option lists. Each option carries the canonical value (kept
// in sync with the Zod enums in src/lib/schemas/eoi.ts) plus an i18n
// label key. Display strings live in locales/{en,ar}.json.

import type { Budget, Source, Timeline, UnitType } from '@/lib/schemas/eoi';

export interface Option<V extends string> {
  value: V;
  labelKey: string;
}

export const UNIT_TYPES: ReadonlyArray<Option<UnitType>> = [
  { value: 'villa', labelKey: 'discover.eoi.options.unitTypes.villa' },
  { value: 'townhouse', labelKey: 'discover.eoi.options.unitTypes.townhouse' },
  { value: 'apartment', labelKey: 'discover.eoi.options.unitTypes.apartment' },
  { value: 'studio', labelKey: 'discover.eoi.options.unitTypes.studio' },
];

export const BUDGET_RANGES: ReadonlyArray<Option<Budget>> = [
  { value: 'under-5m', labelKey: 'discover.eoi.options.budgets.under5m' },
  { value: '5-10m', labelKey: 'discover.eoi.options.budgets.fiveToTen' },
  { value: '10-20m', labelKey: 'discover.eoi.options.budgets.tenToTwenty' },
  { value: '20m-plus', labelKey: 'discover.eoi.options.budgets.twentyPlus' },
];

export const TIMELINES: ReadonlyArray<Option<Timeline>> = [
  { value: 'immediate', labelKey: 'discover.eoi.options.timelines.immediate' },
  { value: '3m', labelKey: 'discover.eoi.options.timelines.threeMonths' },
  { value: '6m', labelKey: 'discover.eoi.options.timelines.sixMonths' },
  { value: '12m', labelKey: 'discover.eoi.options.timelines.twelveMonths' },
  { value: 'exploring', labelKey: 'discover.eoi.options.timelines.exploring' },
];

export const SOURCES: ReadonlyArray<Option<Source>> = [
  { value: 'referral', labelKey: 'discover.eoi.options.sources.referral' },
  { value: 'social', labelKey: 'discover.eoi.options.sources.social' },
  { value: 'website', labelKey: 'discover.eoi.options.sources.website' },
  { value: 'agent', labelKey: 'discover.eoi.options.sources.agent' },
  { value: 'other', labelKey: 'discover.eoi.options.sources.other' },
];
