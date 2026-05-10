import { z } from 'zod';
import { UserSchema, UserUpdateSchema, UuidSchema } from '@stitch/types';
import { endpoint, endpointNoInput } from '../client';

export const getMe = endpointNoInput({
  method: 'GET',
  path: '/users/me',
  outputSchema: UserSchema,
});

export const getUserById = endpoint({
  method: 'GET',
  path: ({ id }: { id: string }) => `/users/${id}`,
  inputSchema: z.object({ id: UuidSchema }),
  outputSchema: UserSchema,
});

export const updateMe = endpoint({
  method: 'PATCH',
  path: '/users/me',
  inputSchema: UserUpdateSchema,
  outputSchema: UserSchema,
});
