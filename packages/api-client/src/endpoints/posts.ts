import { z } from 'zod';
import { PaginationSchema, PostSchema, UuidSchema } from '@stitch/types';
import { endpoint } from '../client';

export const listPosts = endpoint({
  method: 'GET',
  path: '/posts',
  inputSchema: PaginationSchema.extend({
    category: z.string().optional(),
  }),
  outputSchema: z.object({
    items: z.array(PostSchema),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
  }),
});

export const getPost = endpoint({
  method: 'GET',
  path: ({ id }: { id: string }) => `/posts/${id}`,
  inputSchema: z.object({ id: UuidSchema }),
  outputSchema: PostSchema,
});
