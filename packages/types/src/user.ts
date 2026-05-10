import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './shared';

export const UserRoleSchema = z.enum([
  'super_admin',
  'admin',
  'staff',
  'security',
  'resident',
  'prospect',
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: UuidSchema,
  clerkId: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  photoUrl: z.string().url().nullable(),
  role: UserRoleSchema,
  language: z.string().default('en'),
  preferences: z.record(z.unknown()).default({}),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type User = z.infer<typeof UserSchema>;

export const UserCreateSchema = UserSchema.pick({
  clerkId: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  photoUrl: true,
  role: true,
  language: true,
});
export type UserCreate = z.infer<typeof UserCreateSchema>;

export const UserUpdateSchema = UserCreateSchema.partial();
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
