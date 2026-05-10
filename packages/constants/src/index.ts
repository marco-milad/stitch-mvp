export const APP_NAME = 'Stitch';
export const APP_BUNDLE_ID = 'app.stitch.community';
export const APP_SCHEME = 'stitch';

export const TABS = ['home', 'community', 'services', 'discover', 'profile'] as const;
export type Tab = (typeof TABS)[number];

export const USER_ROLES = [
  'super_admin',
  'admin',
  'staff',
  'security',
  'resident',
  'prospect',
] as const;
export type UserRoleConst = (typeof USER_ROLES)[number];

export const POST_CATEGORIES = ['events', 'news', 'announcements', 'community'] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];

export const NOTIFICATION_TYPES = [
  'maintenance',
  'payment',
  'guest',
  'social',
  'security',
  'booking',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const FACILITY_TYPES = [
  'main_pool',
  'kids_pool',
  'gym',
  'tennis',
  'clubhouse',
  'co_working',
] as const;
export type FacilityType = (typeof FACILITY_TYPES)[number];

export const REQUEST_CATEGORIES = [
  'ac',
  'plumbing',
  'electrical',
  'cleaning',
  'pest',
  'other',
] as const;
export type RequestCategory = (typeof REQUEST_CATEGORIES)[number];

export const REQUEST_URGENCY = ['routine', 'priority', 'urgent'] as const;
export type RequestUrgency = (typeof REQUEST_URGENCY)[number];

export const QR_KINDS = ['in', 'out', 'guest', 'denied'] as const;
export type QrKind = (typeof QR_KINDS)[number];

export const SUPPORTED_LOCALES = ['en', 'ar', 'fr', 'de', 'es', 'zh', 'ru', 'tr'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const SUPPORTED_CURRENCIES = [
  'EGP',
  'USD',
  'EUR',
  'GBP',
  'AED',
  'SAR',
  'KWD',
  'QAR',
] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const RTL_LOCALES = ['ar'] as const satisfies readonly Locale[];

export const API_PREFIX = '/api/v1';
