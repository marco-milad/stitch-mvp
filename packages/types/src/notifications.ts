import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './shared';

export const NotificationTypeSchema = z.enum([
  'maintenance',
  'payment',
  'guest',
  'social',
  'security',
  'booking',
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  type: NotificationTypeSchema,
  title: z.string(),
  body: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  readAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});
export type Notification = z.infer<typeof NotificationSchema>;

export const DevicePlatformSchema = z.enum(['ios', 'android', 'web']);
export type DevicePlatform = z.infer<typeof DevicePlatformSchema>;

export const DeviceTokenSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  token: z.string(),
  platform: DevicePlatformSchema,
  createdAt: IsoDateTimeSchema,
  lastUsedAt: IsoDateTimeSchema,
});
export type DeviceToken = z.infer<typeof DeviceTokenSchema>;
