// Services hub data. Mirrors apps/mobile/lib/mock/services.ts.
// TODO: API — replace with GET /api/v1/services in Week 2.

import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  Flower2,
  Cpu,
  Globe,
  HardHat,
  Home,
  Map as MapIcon,
  MessageCircle,
  ParkingSquare,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Waves,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export type ServiceSectionKey = 'daily' | 'compound' | 'property' | 'sales';

export type ServiceTone = 'teal' | 'purple' | 'blue' | 'amber' | 'green' | 'red';

export interface ServiceTile {
  id: string;
  section: ServiceSectionKey;
  name: string;
  sub: string;
  icon: LucideIcon;
  tone: ServiceTone;
  ownerOnly?: boolean;
  /** When true, the category screen renders a providers list + booking flow.
   *  When false/undefined, it renders an info card with a single action. */
  bookable?: boolean;
  /** Tiles whose destination screen doesn't exist yet. Rendered with
   *  reduced opacity + a "Soon" badge, tap is suppressed. Prevents the
   *  silent /services bounce that made the catalog feel broken. */
  comingSoon?: boolean;
  /** Optional override for navigation destination. When set, tapping the tile
   *  navigates here instead of the default `/services/:id`. Used for tiles
   *  that own a dedicated hub screen (e.g. Wellness). */
  to?: string;
  keywords: string;
}

export const SERVICE_SECTIONS: Array<{ key: ServiceSectionKey; label: string }> = [
  { key: 'daily', label: 'Daily' },
  { key: 'compound', label: 'Compound' },
  { key: 'property', label: 'Property' },
  { key: 'sales', label: 'Sales' },
];

export const TONE_BG: Record<ServiceTone, string> = {
  teal: '#CFFAFE',
  purple: '#EDE9FE',
  blue: '#DBEAFE',
  amber: '#FEF3C7',
  green: '#D1FAE5',
  red: '#FEE2E2',
};

export const TONE_FG: Record<ServiceTone, string> = {
  teal: '#0891B2',
  purple: '#7C3AED',
  blue: '#2563EB',
  amber: '#D97706',
  green: '#059669',
  red: '#DC2626',
};

export const SERVICE_TILES: ServiceTile[] = [
  {
    // First slot in the Daily grid — highest-traffic intake path. The
    // tile id stays `daily-home` so all existing routes, the
    // ServiceBook maintenance branch, and the mock provider mapping
    // (TILE_TO_OFFERING_NS) keep working unchanged.
    id: 'daily-home',
    section: 'daily',
    name: 'Maintenance',
    sub: 'Pest · Plumbing · Repair',
    icon: Wrench,
    tone: 'purple',
    bookable: true,
    keywords:
      'plumbing electrical pest carpenter painter ac maintenance صيانة سباكة كهرباء حشرات نجار تكييف',
  },
  {
    id: 'daily-book',
    section: 'daily',
    name: 'Book Facility',
    sub: 'Pools · Gyms · Workspaces',
    icon: Waves,
    tone: 'teal',
    // Routes directly into the premium amenities hub instead of the
    // generic ServiceCategory infoOnly dead-end.
    to: '/amenities',
    keywords: 'pool gym tennis clubhouse co-working booking facility مسبح جيم',
  },
  {
    id: 'daily-cleaning',
    section: 'daily',
    name: 'Cleaning',
    sub: 'Deep · Regular · Post-event',
    icon: Sparkles,
    tone: 'purple',
    bookable: true,
    keywords: 'cleaning maid housekeeping deep تنظيف نظافة شغالة',
  },
  {
    id: 'daily-laundry',
    section: 'daily',
    name: 'Laundry',
    sub: 'Pickup · Delivery',
    icon: Sparkles,
    tone: 'blue',
    bookable: true,
    keywords: 'laundry dry cleaning wash غسيل دراي كلين',
  },
  {
    id: 'daily-delivery',
    section: 'daily',
    name: 'Delivery',
    sub: 'Groceries · Pharmacy · Food',
    icon: ShoppingBag,
    tone: 'amber',
    bookable: true,
    keywords: 'delivery grocery pharmacy food restaurant errand دواء سوبر ماركت طلبات',
  },
  {
    id: 'daily-pet',
    section: 'daily',
    name: 'Pet Services',
    sub: 'Walk · Groom · Vet',
    icon: Wrench,
    tone: 'green',
    bookable: true,
    keywords: 'pet dog cat walking grooming vet kennel كلب قطة بيطري',
  },
  {
    id: 'daily-gardening',
    section: 'daily',
    name: 'Gardening',
    sub: 'Maintenance · Landscaping · Trees',
    icon: Flower2,
    tone: 'green',
    bookable: true,
    keywords: 'gardening landscape trees mowing pruning جنينة حديقة شجر',
  },
  {
    id: 'daily-security-guard',
    section: 'daily',
    name: 'Security Guard',
    sub: 'Event · Patrol · Escort',
    icon: ShieldCheck,
    tone: 'red',
    bookable: true,
    keywords: 'security guard event patrol escort أمن حارس',
  },
  {
    id: 'daily-wellness',
    section: 'daily',
    name: 'Wellness',
    sub: 'Gym · Spa · Classes',
    icon: Sparkles,
    tone: 'purple',
    to: '/services/wellness',
    keywords: 'wellness gym spa yoga pilates massage classes fitness جيم سبا يوجا',
  },
  {
    id: 'daily-hotline',
    section: 'daily',
    name: 'Hotline',
    sub: 'Security · Maintenance',
    icon: Phone,
    tone: 'red',
    // Dedicated screen with tap-to-call rows — no more infoOnly dead-end.
    to: '/services/hotline',
    keywords: 'security maintenance emergency call ivr أمن طوارئ مكالمة',
  },
  {
    id: 'daily-otel',
    section: 'daily',
    name: 'My OTEL',
    sub: 'Resort booking',
    icon: Building2,
    tone: 'green',
    // Routes into the partner-deal hub that hosts OtelBookingButton.
    to: '/services/otel',
    keywords: 'otel hotel resort vacation stay فندق منتجع إجازة',
  },
  {
    id: 'comp-map',
    section: 'compound',
    name: 'Compound Map',
    sub: 'Zones · Directions',
    icon: MapIcon,
    tone: 'teal',
    keywords: 'map zone directions navigation خريطة',
  },
  {
    id: 'comp-outlets',
    section: 'compound',
    name: 'Outlets',
    sub: 'Restaurants · Shops',
    icon: ShoppingBag,
    tone: 'amber',
    comingSoon: true,
    keywords: 'restaurant cafe shop food retail supermarket مطعم كافيه محل',
  },
  {
    id: 'comp-loyalty',
    section: 'compound',
    name: 'Loyalty',
    sub: 'Rewards · Partners',
    icon: Star,
    tone: 'amber',
    comingSoon: true,
    keywords: 'loyalty rewards points partners discount نقاط مكافآت خصم',
  },
  {
    id: 'comp-complaints',
    section: 'compound',
    name: 'Complaints',
    sub: 'Feedback · Reports',
    icon: MessageCircle,
    tone: 'purple',
    comingSoon: true,
    keywords: 'complaint feedback issue report شكوى ملاحظة',
  },
  {
    id: 'comp-parking',
    section: 'compound',
    name: 'Parking',
    sub: 'My slots · Visitor passes',
    icon: ParkingSquare,
    tone: 'blue',
    to: '/services/parking',
    keywords: 'parking slot visitor pass plate موقف ضيوف لوحة',
  },
  {
    id: 'comp-smart-home',
    section: 'compound',
    name: 'Smart Home',
    sub: 'Devices · Scenes · Usage',
    icon: Cpu,
    tone: 'purple',
    to: '/services/smart-home',
    keywords: 'smart home iot ac light lock thermostat scene بيت ذكي تكييف إضاءة',
  },
  {
    id: 'prop-payments',
    section: 'property',
    name: 'Payments',
    sub: 'Invoices · Installments',
    icon: CreditCard,
    tone: 'red',
    comingSoon: true,
    keywords: 'payment invoice bill installment fee maintenance دفع فاتورة قسط',
  },
  // Deleted: `prop-maint`. Its tracking concept ("My requests") is
  // owned by the sacred dark banner at the top of /services and by
  // the dedicated /services/requests screen — keeping a duplicate
  // tile here just gave residents two cold paths to the same place.
  {
    id: 'prop-unit',
    section: 'property',
    name: 'Unit Details',
    sub: 'Specs · Members',
    icon: Home,
    tone: 'purple',
    comingSoon: true,
    keywords: 'unit villa apartment members specs وحدة فيلا شقة',
  },
  {
    id: 'prop-viol',
    section: 'property',
    name: 'Violations',
    sub: 'Fines · T&Cs',
    icon: AlertTriangle,
    tone: 'red',
    comingSoon: true,
    keywords: 'violation fine penalty rules مخالفة غرامة',
  },
  {
    id: 'prop-const',
    section: 'property',
    name: 'Construction',
    sub: 'Progress · Handover',
    icon: HardHat,
    tone: 'amber',
    ownerOnly: true,
    comingSoon: true,
    keywords: 'construction handover progress milestone بناء تسليم',
  },
  {
    id: 'prop-docs',
    section: 'property',
    name: 'Documents',
    sub: 'Contract · Deed',
    icon: FileText,
    tone: 'blue',
    ownerOnly: true,
    comingSoon: true,
    keywords: 'documents contract deed paperwork legal مستندات عقد',
  },
  {
    id: 'sales-eoi',
    section: 'sales',
    name: 'Explore EOIs',
    sub: '6 projects worldwide',
    icon: Globe,
    tone: 'purple',
    comingSoon: true,
    keywords: 'eoi projects international invest interest عقار استثمار',
  },
  {
    id: 'sales-appt',
    section: 'sales',
    name: 'Appointments',
    sub: 'Site visits · Meetings',
    icon: CalendarDays,
    tone: 'blue',
    comingSoon: true,
    keywords: 'appointment meeting visit booking schedule موعد اجتماع',
  },
];

export function searchCorpus(tile: ServiceTile): string {
  return `${tile.name} ${tile.sub} ${tile.keywords}`.toLowerCase();
}
