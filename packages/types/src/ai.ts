import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './shared';

export const ConversationContextSchema = z.enum([
  'maintenance',
  'guest',
  'facilities',
  'community',
  'general',
]);
export type ConversationContext = z.infer<typeof ConversationContextSchema>;

export const ConversationSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema.nullable(),
  context: ConversationContextSchema,
  startedAt: IsoDateTimeSchema,
  endedAt: IsoDateTimeSchema.nullable(),
  metadata: z.record(z.unknown()),
});
export type Conversation = z.infer<typeof ConversationSchema>;

export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const MessageSchema = z.object({
  id: UuidSchema,
  conversationId: UuidSchema,
  role: MessageRoleSchema,
  content: z.string().nullable(),
  audioUrl: z.string().url().nullable(),
  createdAt: IsoDateTimeSchema,
});
export type Message = z.infer<typeof MessageSchema>;

export const AiSessionStatusSchema = z.enum(['active', 'ended', 'error']);
export type AiSessionStatus = z.infer<typeof AiSessionStatusSchema>;

export const AiSessionSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema.nullable(),
  conversationId: UuidSchema.nullable(),
  geminiSessionId: z.string().nullable(),
  status: AiSessionStatusSchema,
  startedAt: IsoDateTimeSchema,
  endedAt: IsoDateTimeSchema.nullable(),
  errorLog: z.record(z.unknown()).nullable(),
});
export type AiSession = z.infer<typeof AiSessionSchema>;
