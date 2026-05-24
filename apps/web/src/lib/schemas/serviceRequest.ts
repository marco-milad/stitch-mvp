// Service-request schema for resident-mode bookings (Cleaning, Laundry,
// Gardening, Security Guard, etc.). The persisted entity carries
// `id` / `status` / `createdAt` that the form input doesn't.

import { z } from 'zod';

export const REQUEST_STATUS_VALUES = [
  'pending',
  'confirmed',
  'in-progress',
  'completed',
  'cancelled',
] as const;
export type RequestStatus = (typeof REQUEST_STATUS_VALUES)[number];

/** Fields the user actually fills in. Used as the RHF schema in ServiceBook. */
export const serviceBookingFormSchema = z.object({
  dateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'services.book.fields.date.error' }),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/, { message: 'services.book.fields.time.error' }),
  notes: z.string().max(500).optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'services.book.fields.consent.error' }),
  }),
});
export type ServiceBookingFormInput = z.infer<typeof serviceBookingFormSchema>;

/** Full persisted record — what the store holds. */
export const serviceRequestSchema = serviceBookingFormSchema.extend({
  id: z.string(),
  tileId: z.string(),
  providerId: z.string(),
  offeringKey: z.string(),
  propertyId: z.string(),
  status: z.enum(REQUEST_STATUS_VALUES),
  createdAt: z.string(),
});
export type ServiceRequest = z.infer<typeof serviceRequestSchema>;

const ACTIVE: ReadonlySet<RequestStatus> = new Set(['pending', 'confirmed', 'in-progress']);
export function isActiveStatus(status: RequestStatus): boolean {
  return ACTIVE.has(status);
}
