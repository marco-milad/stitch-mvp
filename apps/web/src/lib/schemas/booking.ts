// Booking form schema for the Discover prospect flow.
// Error messages are i18n KEYS — translated at render time.

import { z } from 'zod';

export const VISIT_TYPE_VALUES = ['showroom', 'virtual', 'onsite'] as const;
export type VisitType = (typeof VISIT_TYPE_VALUES)[number];

export const bookingSchema = z.object({
  visitType: z.enum(VISIT_TYPE_VALUES, {
    errorMap: () => ({ message: 'discover.book.fields.visitType.error' }),
  }),
  dateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'discover.book.fields.date.error' }),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/, { message: 'discover.book.fields.time.error' }),
  advisorId: z.string().default('ANY'),

  name: z
    .string()
    .trim()
    .min(2, { message: 'discover.book.fields.name.error' })
    .max(80, { message: 'discover.book.fields.name.error' }),
  email: z.string().trim().email({ message: 'discover.book.fields.email.error' }),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 \-()]{7,20}$/, { message: 'discover.book.fields.phone.error' }),

  notes: z.string().max(500).optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'discover.book.fields.consent.error' }),
  }),
});

export type BookingInput = z.infer<typeof bookingSchema>;
