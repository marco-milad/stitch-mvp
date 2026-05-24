// Household member access management. Members are scoped per property
// (each unit has its own roster); roles drive a default permission
// matrix that the owner can fine-tune per member after invitation.
//
// Errors are i18n KEYS — the form translates them at render time, per
// the project convention.

import { z } from 'zod';

export const FAMILY_ROLE_VALUES = ['co-owner', 'resident', 'child', 'guest'] as const;
export type FamilyRole = (typeof FAMILY_ROLE_VALUES)[number];

export const PERMISSION_KEYS = [
  'bookServices',
  'controlSmartHome',
  'issueVisitorPasses',
  'makePayments',
  'viewFinancials',
  'manageMembers',
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const permissionsSchema = z.object({
  bookServices: z.boolean(),
  controlSmartHome: z.boolean(),
  issueVisitorPasses: z.boolean(),
  makePayments: z.boolean(),
  viewFinancials: z.boolean(),
  manageMembers: z.boolean(),
});
export type FamilyPermissions = z.infer<typeof permissionsSchema>;

/** Sensible defaults per role — used to pre-fill the invite form, and as
 *  a "reset to role defaults" reference when a member's permissions get
 *  hand-tuned and the owner wants to start over. */
export const DEFAULT_PERMISSIONS: Record<FamilyRole, FamilyPermissions> = {
  'co-owner': {
    bookServices: true,
    controlSmartHome: true,
    issueVisitorPasses: true,
    makePayments: true,
    viewFinancials: true,
    manageMembers: true,
  },
  resident: {
    bookServices: true,
    controlSmartHome: true,
    issueVisitorPasses: true,
    makePayments: true,
    viewFinancials: true,
    manageMembers: false,
  },
  child: {
    bookServices: true,
    controlSmartHome: true,
    issueVisitorPasses: false,
    makePayments: false,
    viewFinancials: false,
    manageMembers: false,
  },
  guest: {
    bookServices: false,
    controlSmartHome: false,
    issueVisitorPasses: false,
    makePayments: false,
    viewFinancials: false,
    manageMembers: false,
  },
};

export const STATUS_VALUES = ['active', 'pending', 'expired'] as const;
export type MemberStatus = (typeof STATUS_VALUES)[number];

export const familyInviteFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: 'family.invite.fields.fullName.error' })
    .max(80, { message: 'family.invite.fields.fullName.error' }),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\+?[0-9 \-()]{7,20}$/, { message: 'family.invite.fields.phoneNumber.error' }),
  // Optional — empty string accepted; if non-empty, must be a valid email.
  email: z
    .string()
    .email({ message: 'family.invite.fields.email.error' })
    .or(z.literal(''))
    .optional(),
  role: z.enum(FAMILY_ROLE_VALUES, {
    errorMap: () => ({ message: 'family.invite.fields.role.error' }),
  }),
  permissions: permissionsSchema,
});
export type FamilyInviteFormInput = z.infer<typeof familyInviteFormSchema>;

export const familyMemberSchema = familyInviteFormSchema.extend({
  id: z.string(),
  propertyId: z.string(),
  status: z.enum(STATUS_VALUES),
  /** One of a small palette of Tailwind-style hex colors. */
  avatarColor: z.string(),
  invitedAt: z.string(),
  activatedAt: z.string().nullable(),
});
export type FamilyMember = z.infer<typeof familyMemberSchema>;

/** Initials for the avatar tile. Falls back to '?' when input is empty. */
export function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

/** Number of enabled permissions — for the "{{n}} of {{total}} enabled" summary. */
export function countEnabled(p: FamilyPermissions): number {
  return PERMISSION_KEYS.reduce((n, k) => n + (p[k] ? 1 : 0), 0);
}

export const AVATAR_PALETTE = [
  '#06B6D4', // cyan
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EC4899', // pink
  '#7C3AED', // violet
  '#F97316', // orange
  '#0EA5E9', // sky
  '#84CC16', // lime
] as const;

export function pickAvatarColor(seed: string): string {
  // Deterministic from id so colors stay stable across renders/reloads.
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[idx]!;
}
