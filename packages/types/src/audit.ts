import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './shared';

export const AuditActionSchema = z.enum([
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'view',
  'export',
]);
export type AuditAction = z.infer<typeof AuditActionSchema>;

export const AuditResourceTypeSchema = z.enum([
  'user',
  'unit',
  'unit_member',
  'post',
  'reel',
  'story',
  'comment',
  'booking',
  'maintenance_request',
  'invoice',
  'guest',
  'qr_log',
  'notification',
  'conversation',
]);
export type AuditResourceType = z.infer<typeof AuditResourceTypeSchema>;

export const AuditLogSchema = z.object({
  id: UuidSchema,
  actorId: UuidSchema.nullable(),
  action: AuditActionSchema,
  resourceType: AuditResourceTypeSchema,
  resourceId: UuidSchema.nullable(),
  payload: z.record(z.unknown()).nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
});
export type AuditLog = z.infer<typeof AuditLogSchema>;
