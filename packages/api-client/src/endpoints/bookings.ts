import { z } from 'zod';
import { BookingSchema, IsoDateSchema, UuidSchema } from '@stitch/types';
import { endpoint, endpointNoInput } from '../client';

export const listMyBookings = endpointNoInput({
  method: 'GET',
  path: '/bookings/mine',
  outputSchema: z.array(BookingSchema),
});

export const createBooking = endpoint({
  method: 'POST',
  path: '/bookings',
  inputSchema: z.object({
    facility: z.string(),
    date: IsoDateSchema,
    slot: z.string(),
    guests: z.number().int().min(0).default(0),
    unitId: UuidSchema.optional(),
  }),
  outputSchema: BookingSchema,
});

export const cancelBooking = endpoint({
  method: 'DELETE',
  path: ({ id }: { id: string }) => `/bookings/${id}`,
  inputSchema: z.object({ id: UuidSchema }),
  outputSchema: BookingSchema,
});
