import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './shared';

export const PostCategorySchema = z.enum(['events', 'news', 'announcements', 'community']);
export type PostCategory = z.infer<typeof PostCategorySchema>;

export const PostSlideSchema = z.object({
  bg: z.string(),
  emoji: z.string().optional(),
  title: z.string(),
  sub: z.string().optional(),
});
export type PostSlide = z.infer<typeof PostSlideSchema>;

export const PostSchema = z.object({
  id: UuidSchema,
  category: PostCategorySchema,
  caption: z.string(),
  slides: z.array(PostSlideSchema),
  isPinned: z.boolean(),
  authorId: UuidSchema.nullable(),
  publishedAt: IsoDateTimeSchema,
  createdAt: IsoDateTimeSchema,
});
export type Post = z.infer<typeof PostSchema>;

export const ReelVisualKindSchema = z.enum(['water', 'zen', 'fire', 'leaves', 'sparkle']);
export type ReelVisualKind = z.infer<typeof ReelVisualKindSchema>;

export const ReelSchema = z.object({
  id: UuidSchema,
  category: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  visualKind: ReelVisualKindSchema.nullable(),
  videoUrl: z.string().url().nullable(),
  authorId: UuidSchema.nullable(),
  publishedAt: IsoDateTimeSchema,
});
export type Reel = z.infer<typeof ReelSchema>;

export const StorySchema = z.object({
  id: UuidSchema,
  emoji: z.string().nullable(),
  label: z.string(),
  title: z.string().nullable(),
  subtitle: z.string().nullable(),
  visual: z.string().nullable(),
  expiresAt: IsoDateTimeSchema.nullable(),
  authorId: UuidSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});
export type Story = z.infer<typeof StorySchema>;

export const CommentSchema = z.object({
  id: UuidSchema,
  postId: UuidSchema,
  userId: UuidSchema,
  content: z.string(),
  createdAt: IsoDateTimeSchema,
});
export type Comment = z.infer<typeof CommentSchema>;
