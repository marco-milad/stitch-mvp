import { z } from 'zod';
import { IsoDateSchema, IsoDateTimeSchema, UuidSchema } from './shared';

export const UnitSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  project: z.string().nullable(),
  type: z.string().nullable(),
  beds: z.number().int().nullable(),
  baths: z.number().int().nullable(),
  areaSqm: z.number().int().nullable(),
  floor: z.number().int().nullable(),
  status: z.string().nullable(),
  valueEgp: z.number().int().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: IsoDateTimeSchema,
});
export type Unit = z.infer<typeof UnitSchema>;

export const UnitMemberRoleSchema = z.enum(['owner', 'tenant', 'family', 'guest']);
export type UnitMemberRole = z.infer<typeof UnitMemberRoleSchema>;

export const UnitMemberSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  unitId: UuidSchema,
  role: UnitMemberRoleSchema,
  since: IsoDateSchema.nullable(),
  isPrimary: z.boolean(),
});
export type UnitMember = z.infer<typeof UnitMemberSchema>;
