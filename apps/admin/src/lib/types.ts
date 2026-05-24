// Admin-side view models. Re-uses `@stitch/types` schemas as the SSOT for
// shapes already shared with the resident app; extends them with admin-only
// fields (status, scheduledAt, etc.) that don't belong on the public feed.

import { z } from 'zod';
import { PostCategorySchema, PostSlideSchema, ReelVisualKindSchema } from '@stitch/types';
import { REQUEST_CATEGORIES, REQUEST_URGENCY, QR_KINDS } from '@stitch/constants';

// ─── Content ────────────────────────────────────────────────────────────────

export const FeedItemStatusSchema = z.enum(['draft', 'scheduled', 'live']);
export type FeedItemStatus = z.infer<typeof FeedItemStatusSchema>;

export const AdminPostSchema = z.object({
  id: z.string(),
  kind: z.literal('post'),
  category: PostCategorySchema,
  caption: z.string().min(1),
  slides: z.array(PostSlideSchema).min(1),
  pinned: z.boolean().default(false),
  isEvent: z.boolean().default(false),
  status: FeedItemStatusSchema,
  publishedAt: z.string(),
  authorName: z.string(),
});
export type AdminPost = z.infer<typeof AdminPostSchema>;

export const AdminReelSchema = z.object({
  id: z.string(),
  kind: z.literal('reel'),
  category: PostCategorySchema,
  title: z.string().min(1),
  description: z.string(),
  visualKind: ReelVisualKindSchema,
  status: FeedItemStatusSchema,
  publishedAt: z.string(),
  authorName: z.string(),
});
export type AdminReel = z.infer<typeof AdminReelSchema>;

export type AdminFeedItem = AdminPost | AdminReel;

// ─── Service requests ───────────────────────────────────────────────────────

export const RequestStatusSchema = z.enum(['pending', 'in_progress', 'resolved']);
export type RequestStatus = z.infer<typeof RequestStatusSchema>;

export const RequestCategorySchema = z.enum(REQUEST_CATEGORIES);
export type AdminRequestCategory = z.infer<typeof RequestCategorySchema>;

export const RequestUrgencySchema = z.enum(REQUEST_URGENCY);
export type AdminRequestUrgency = z.infer<typeof RequestUrgencySchema>;

export interface Technician {
  id: string;
  name: string;
  specialty: AdminRequestCategory;
  load: number; // active assignments
}

export interface ServiceRequest {
  id: string;
  residentName: string;
  unit: string;
  category: AdminRequestCategory;
  urgency: AdminRequestUrgency;
  summary: string;
  status: RequestStatus;
  assigneeId: string | null;
  openedAt: string;
}

// ─── Gate & Parking ─────────────────────────────────────────────────────────

export const PermitStatusSchema = z.enum(['pending', 'approved', 'rejected', 'expired']);
export type PermitStatus = z.infer<typeof PermitStatusSchema>;

export interface ParkingPermit {
  id: string;
  residentName: string;
  unit: string;
  vehicleMake: string;
  vehiclePlate: string;
  validFrom: string;
  validTo: string;
  status: PermitStatus;
}

export const QrKindSchema = z.enum(QR_KINDS);
export type AdminQrKind = z.infer<typeof QrKindSchema>;

export interface VisitorQrScan {
  id: string;
  code: string;
  hostName: string;
  unit: string;
  visitorName: string;
  kind: AdminQrKind;
  scannedAt: string;
}

// ─── Live gate scan stream (Week 7) ─────────────────────────────────────────

export type GateId = 'main' | 'gate1' | 'gate2' | 'gate3';
export type ZoneId = 'phase1' | 'sarai' | 'tajSultan' | 'sahel';
export type ScanDirection = 'in' | 'out';
export type VisitorKind = 'guest' | 'contractor' | 'delivery' | 'resident';
export type ScanStatus = 'approved' | 'denied' | 'expired';

export interface GateScanEvent {
  id: string;
  timestamp: string;
  gate: GateId;
  zone: ZoneId;
  direction: ScanDirection;
  visitorKind: VisitorKind;
  visitorName: string;
  hostName: string | null;
  unit: string | null;
  code: string;
  status: ScanStatus;
  note: string | null;
}
