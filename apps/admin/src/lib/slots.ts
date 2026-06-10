// Maintenance / booking slot constants — mirrors the backend's
// `app.services.maintenance_slots.TIME_SLOTS` and the resident frontend's
// `MAINTENANCE_TIME_SLOTS`. Single source of truth on the admin side so
// the load ribbon, filter dropdowns, and "unscheduled" sentinel all
// agree on the same 8-slot grid. Edit here if the backend ever changes
// the slot shape.

export const MAINTENANCE_TIME_SLOTS = [
  '09:00-12:00',
  '12:00-15:00',
  '15:00-18:00',
  '18:00-21:00',
  '21:00-00:00',
  '00:00-03:00',
  '03:00-06:00',
  '06:00-09:00',
] as const;

export type MaintenanceTimeSlot = (typeof MAINTENANCE_TIME_SLOTS)[number];

export const CAPACITY_PER_SLOT = 3;

/** Sentinel value used by the slot filter to mean "rows without a
 *  scheduled slot". Distinct from `null` so the select element has a
 *  stringly-typed value to bind to. */
export const UNSCHEDULED_SENTINEL = '__unscheduled__';

/** Today's date in YYYY-MM-DD form, in the user's local time zone.
 *  We deliberately use local time (not UTC) so an admin sitting in
 *  Cairo sees "today" mean their wall-clock today, matching the
 *  resident's mental model when picking a slot. */
export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Color tone for a slot chip given its current count. */
export type SlotTone = 'empty' | 'partial' | 'full';

export function slotTone(count: number): SlotTone {
  if (count <= 0) return 'empty';
  if (count >= CAPACITY_PER_SLOT) return 'full';
  return 'partial';
}
