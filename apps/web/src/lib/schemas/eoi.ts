// EOI (Expression of Interest) form schema for the Discover prospect flow.
// Error messages are i18n KEYS, not display strings — the form translates
// them at render time. Matches the project convention.

import { z } from 'zod';

// Re-exported from property.ts so the single source of truth for unit types
// is the resident-mode property schema (used by both the prospect EOI form
// and the price calculator).
export { UNIT_TYPE_VALUES, type UnitType } from './property';
import { UNIT_TYPE_VALUES } from './property';

export const BUDGET_VALUES = ['under-5m', '5-10m', '10-20m', '20m-plus'] as const;
export const TIMELINE_VALUES = ['immediate', '3m', '6m', '12m', 'exploring'] as const;
export const SOURCE_VALUES = ['referral', 'social', 'website', 'agent', 'other'] as const;

export const eoiSchema = z.object({
  // About you
  name: z
    .string()
    .trim()
    .min(2, { message: 'discover.eoi.fields.name.error' })
    .max(80, { message: 'discover.eoi.fields.name.error' }),
  email: z.string().trim().email({ message: 'discover.eoi.fields.email.error' }),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 \-()]{7,20}$/, { message: 'discover.eoi.fields.phone.error' }),

  // What you're looking for
  interestedIn: z.enum(UNIT_TYPE_VALUES, {
    errorMap: () => ({ message: 'discover.eoi.fields.interestedIn.error' }),
  }),
  budget: z.enum(BUDGET_VALUES, {
    errorMap: () => ({ message: 'discover.eoi.fields.budget.error' }),
  }),
  timeline: z.enum(TIMELINE_VALUES, {
    errorMap: () => ({ message: 'discover.eoi.fields.timeline.error' }),
  }),

  // Extras (optional)
  source: z.enum(SOURCE_VALUES).optional(),
  notes: z.string().max(500).optional(),

  // Required consent
  consent: z.literal(true, {
    errorMap: () => ({ message: 'discover.eoi.fields.consent.error' }),
  }),
});

export type EoiInput = z.infer<typeof eoiSchema>;
export type Budget = (typeof BUDGET_VALUES)[number];
export type Timeline = (typeof TIMELINE_VALUES)[number];
export type Source = (typeof SOURCE_VALUES)[number];
