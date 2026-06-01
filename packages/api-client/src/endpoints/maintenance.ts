import { z } from 'zod';
import { MaintenanceRequestCreateSchema, MaintenanceRequestSchema } from '@stitch/types';
import { endpoint, endpointNoInput } from '../client';

export const listMyRequests = endpointNoInput({
  method: 'GET',
  path: '/me/requests',
  outputSchema: z.array(MaintenanceRequestSchema),
});

export const createMyRequest = endpoint({
  method: 'POST',
  path: '/me/requests',
  inputSchema: MaintenanceRequestCreateSchema,
  outputSchema: MaintenanceRequestSchema,
});
