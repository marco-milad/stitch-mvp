// Services hub data. Mirrors public/index.html SHUB.
// TODO: API — replace with GET /api/v1/services in Week 2.

import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  Globe,
  HardHat,
  Home,
  Map as MapIcon,
  MessageCircle,
  Phone,
  ShoppingBag,
  Sparkles,
  Star,
  Waves,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';

export type ServiceSectionKey = 'daily' | 'compound' | 'property' | 'sales';

export type ServiceTone = 'teal' | 'purple' | 'blue' | 'amber' | 'green' | 'red';

export interface ServiceTile {
  id: string;
  section: ServiceSectionKey;
  name: string;
  sub: string;
  icon: LucideIcon;
  tone: ServiceTone;
  /** When true, only show to owners. */
  ownerOnly?: boolean;
  /** Search corpus (name + sub + this string), all lowercased. */
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
  // ── daily (8) ───────────────────────────────────────────
  {
    id: 'daily-book',
    section: 'daily',
    name: 'Book Facility',
    sub: 'Pools · Gyms · Workspaces',
    icon: Waves,
    tone: 'teal',
    keywords: 'pool gym tennis clubhouse co-working booking facility مسبح جيم',
  },
  {
    id: 'daily-cleaning',
    section: 'daily',
    name: 'Cleaning',
    sub: 'Deep · Regular · Post-event',
    icon: Sparkles,
    tone: 'purple',
    keywords: 'cleaning maid housekeeping deep تنظيف نظافة شغالة',
  },
  {
    id: 'daily-laundry',
    section: 'daily',
    name: 'Laundry',
    sub: 'Pickup · Delivery',
    icon: Sparkles,
    tone: 'blue',
    keywords: 'laundry dry cleaning wash غسيل دراي كلين',
  },
  {
    id: 'daily-delivery',
    section: 'daily',
    name: 'Delivery',
    sub: 'Groceries · Pharmacy · Food',
    icon: ShoppingBag,
    tone: 'amber',
    keywords: 'delivery grocery pharmacy food restaurant errand دواء سوبر ماركت طلبات',
  },
  {
    id: 'daily-pet',
    section: 'daily',
    name: 'Pet Services',
    sub: 'Walk · Groom · Vet',
    icon: Wrench,
    tone: 'green',
    keywords: 'pet dog cat walking grooming vet kennel كلب قطة بيطري',
  },
  {
    id: 'daily-home',
    section: 'daily',
    name: 'Home Services',
    sub: 'Pest · Plumbing · Repair',
    icon: Wrench,
    tone: 'purple',
    keywords: 'plumbing electrical pest carpenter painter سباكة كهرباء حشرات نجار',
  },
  {
    id: 'daily-hotline',
    section: 'daily',
    name: 'Hotline',
    sub: 'Security · Maintenance',
    icon: Phone,
    tone: 'red',
    keywords: 'security maintenance emergency call ivr أمن طوارئ مكالمة',
  },
  {
    id: 'daily-otel',
    section: 'daily',
    name: 'My OTEL',
    sub: 'Resort booking',
    icon: Building2,
    tone: 'green',
    keywords: 'otel hotel resort vacation stay فندق منتجع إجازة',
  },

  // ── compound (4) ────────────────────────────────────────
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
    keywords: 'restaurant cafe shop food retail supermarket مطعم كافيه محل',
  },
  {
    id: 'comp-loyalty',
    section: 'compound',
    name: 'Loyalty',
    sub: 'Rewards · Partners',
    icon: Star,
    tone: 'amber',
    keywords: 'loyalty rewards points partners discount نقاط مكافآت خصم',
  },
  {
    id: 'comp-complaints',
    section: 'compound',
    name: 'Complaints',
    sub: 'Feedback · Reports',
    icon: MessageCircle,
    tone: 'purple',
    keywords: 'complaint feedback issue report شكوى ملاحظة',
  },

  // ── property (6) ────────────────────────────────────────
  {
    id: 'prop-payments',
    section: 'property',
    name: 'Payments',
    sub: 'Invoices · Installments',
    icon: CreditCard,
    tone: 'red',
    keywords: 'payment invoice bill installment fee maintenance دفع فاتورة قسط',
  },
  {
    id: 'prop-maint',
    section: 'property',
    name: 'Maintenance',
    sub: 'My requests',
    icon: Wrench,
    tone: 'green',
    keywords: 'maintenance request ticket repair fix ac plumbing صيانة طلب تكييف',
  },
  {
    id: 'prop-unit',
    section: 'property',
    name: 'Unit Details',
    sub: 'Specs · Members',
    icon: Home,
    tone: 'purple',
    keywords: 'unit villa apartment members specs وحدة فيلا شقة',
  },
  {
    id: 'prop-viol',
    section: 'property',
    name: 'Violations',
    sub: 'Fines · T&Cs',
    icon: AlertTriangle,
    tone: 'red',
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
    keywords: 'documents contract deed paperwork legal مستندات عقد',
  },

  // ── sales (2) ───────────────────────────────────────────
  {
    id: 'sales-eoi',
    section: 'sales',
    name: 'Explore EOIs',
    sub: '6 projects worldwide',
    icon: Globe,
    tone: 'purple',
    keywords: 'eoi projects international invest interest عقار استثمار',
  },
  {
    id: 'sales-appt',
    section: 'sales',
    name: 'Appointments',
    sub: 'Site visits · Meetings',
    icon: CalendarDays,
    tone: 'blue',
    keywords: 'appointment meeting visit booking schedule موعد اجتماع',
  },
];

export function searchCorpus(tile: ServiceTile): string {
  return `${tile.name} ${tile.sub} ${tile.keywords}`.toLowerCase();
}
