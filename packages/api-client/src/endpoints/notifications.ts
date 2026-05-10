import { z } from 'zod';
import { NotificationSchema, UuidSchema } from '@stitch/types';
import { endpoint, endpointNoInput } from '../client';

export const listMyNotifications = endpointNoInput({
  method: 'GET',
  path: '/notifications',
  outputSchema: z.array(NotificationSchema),
});

export const markRead = endpoint({
  method: 'POST',
  path: ({ id }: { id: string }) => `/notifications/${id}/read`,
  inputSchema: z.object({ id: UuidSchema }),
  outputSchema: NotificationSchema,
});
