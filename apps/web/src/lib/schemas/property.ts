// Resident-mode property model. One user can own/occupy several units
// across one or more compounds; `propertyStore` tracks which is "current"
// for the Home tab + downstream services context.

import { z } from 'zod';

export const UNIT_TYPE_VALUES = ['villa', 'townhouse', 'apartment', 'studio'] as const;
export const OWNERSHIP_VALUES = ['owner', 'tenant', 'family-member'] as const;
export const HANDOVER_STATUS_VALUES = ['planned', 'under-construction', 'delivered'] as const;
// Zones of Madinet Masr — used to compute "Immediate Neighbor" matches
// in the neighbors directory. Kept here (not in neighbors.ts) so the
// Property schema owns its own field semantics.
export const ZONE_VALUES = ['phase1', 'sarai', 'tajSultan', 'sahel'] as const;
export type PropertyZone = (typeof ZONE_VALUES)[number];

export const propertySchema = z.object({
  id: z.string(),
  compoundSlug: z.string(),
  compoundName: z.string(),
  unitName: z.string(),
  unitType: z.enum(UNIT_TYPE_VALUES),
  building: z.string().optional(),
  areaM2: z.number().int().positive(),
  bedrooms: z.number().int().min(0),
  ownership: z.enum(OWNERSHIP_VALUES),
  handoverStatus: z.enum(HANDOVER_STATUS_VALUES),
  /** ISO date (YYYY-MM-DD) — for delivered units the day of handover; for under-construction, the planned ETA. */
  handoverDate: z.string().nullable(),
  /** Marks the user's primary home unit; Home tab defaults to this on first load. */
  primary: z.boolean(),
  /** Which Madinet Masr zone the unit lives in — drives "Immediate Neighbor" matching. */
  zone: z.enum(ZONE_VALUES),
});

export type Property = z.infer<typeof propertySchema>;
export type UnitType = (typeof UNIT_TYPE_VALUES)[number];
export type Ownership = (typeof OWNERSHIP_VALUES)[number];
export type HandoverStatus = (typeof HANDOVER_STATUS_VALUES)[number];
