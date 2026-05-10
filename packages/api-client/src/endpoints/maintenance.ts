import { z } from 'zod';
import { MaintenanceRequestSchema, RequestUrgencySchema, UuidSchema } from '@stitch/types';
import { endpoint, endpointNoInput } from '../client';

export const listMyRequests = endpointNoInput({
  method: 'GET',
  path: '/maintenance/mine',
  outputSchema: z.array(MaintenanceRequestSchema),
});

export const createMaintenanceRequest = endpoint({
  method: 'POST',
  path: '/maintenance',
  inputSchema: z.object({
    category: z.string(),
    urgency: RequestUrgencySchema,
    description: z.string().nullable(),
    photoUrl: z.string().url().nullable(),
    unitId: UuidSchema.optional(),
  }),
  outputSchema: MaintenanceRequestSchema,
});
