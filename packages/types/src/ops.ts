import { z } from 'zod';
import { IsoDateSchema, IsoDateTimeSchema, UuidSchema } from './shared';

export const BookingStatusSchema = z.enum(['confirmed', 'cancelled', 'completed']);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const BookingSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  unitId: UuidSchema.nullable(),
  facility: z.string(),
  date: IsoDateSchema,
  slot: z.string(),
  guests: z.number().int().min(0),
  status: BookingStatusSchema,
  createdAt: IsoDateTimeSchema,
});
export type Booking = z.infer<typeof BookingSchema>;

export const RequestUrgencySchema = z.enum(['routine', 'priority', 'urgent']);
export type RequestUrgency = z.infer<typeof RequestUrgencySchema>;

export const RequestStatusSchema = z.enum([
  'submitted',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
]);
export type RequestStatus = z.infer<typeof RequestStatusSchema>;

export const TimelineEntrySchema = z.object({
  at: IsoDateTimeSchema,
  status: RequestStatusSchema,
  note: z.string().optional(),
  byUserId: UuidSchema.optional(),
});
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

export const MaintenanceRequestSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  unitId: UuidSchema.nullable(),
  category: z.string(),
  urgency: RequestUrgencySchema,
  description: z.string().nullable(),
  photoUrl: z.string().url().nullable(),
  status: RequestStatusSchema,
  timeline: z.array(TimelineEntrySchema),
  createdAt: IsoDateTimeSchema,
});
export type MaintenanceRequest = z.infer<typeof MaintenanceRequestSchema>;

export const InvoiceStatusSchema = z.enum(['due', 'paid', 'overdue', 'cancelled']);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const InvoiceSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  unitId: UuidSchema.nullable(),
  title: z.string().nullable(),
  sub: z.string().nullable(),
  amountEgp: z.number().int(),
  status: InvoiceStatusSchema,
  dueDate: IsoDateSchema.nullable(),
  paidAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const GuestValiditySchema = z.enum(['1h', '4h', '24h', '7d']);
export type GuestValidity = z.infer<typeof GuestValiditySchema>;

export const GuestSchema = z.object({
  id: UuidSchema,
  inviterId: UuidSchema,
  unitId: UuidSchema.nullable(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  visitDate: IsoDateSchema.nullable(),
  validity: GuestValiditySchema.nullable(),
  qrToken: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
});
export type Guest = z.infer<typeof GuestSchema>;

export const QrKindSchema = z.enum(['in', 'out', 'guest', 'denied']);
export type QrKind = z.infer<typeof QrKindSchema>;

export const QrStatusSchema = z.enum(['allow', 'deny']);
export type QrStatus = z.infer<typeof QrStatusSchema>;

export const QrLogSchema = z.object({
  id: UuidSchema,
  unitId: UuidSchema.nullable(),
  userId: UuidSchema.nullable(),
  guestId: UuidSchema.nullable(),
  kind: QrKindSchema,
  gate: z.string().nullable(),
  method: z.string().nullable(),
  status: QrStatusSchema.nullable(),
  note: z.string().nullable(),
  occurredAt: IsoDateTimeSchema,
});
export type QrLog = z.infer<typeof QrLogSchema>;
