// Compound wayfinding map — resident-facing hotspots for `/services/comp-map`.
// Distinct from the prospect master-plan (apps/web/src/lib/mock/discover.ts
// MASTER_PLAN_ZONES) which is brochure-style zoning. This dataset is for
// practical inside-the-compound navigation.

import {
  Building2,
  Coffee,
  Dumbbell,
  Flower2,
  Fuel,
  Gamepad2,
  PillBottle,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Trees,
  Waves,
  type LucideIcon,
} from 'lucide-react';

export type HotspotCategory = 'amenity' | 'gate' | 'commercial';

export interface MapHotspot {
  id: string;
  category: HotspotCategory;
  nameKey: string;
  subKey: string;
  icon: LucideIcon;
  /** Normalized 0..1 on the SVG viewBox / container. */
  x: number;
  y: number;
  actions: {
    directions?: boolean;
    /** Real `tel:` link, e.g. '+201234567890'. */
    callTel?: string;
    /** Deep-link target — any in-app route (e.g. `/services/wellness` or `/services/daily-book`). */
    bookHref?: string;
    learnMore?: boolean;
  };
}

export const HOTSPOT_TONE: Record<HotspotCategory, { dot: string; chip: string; ring: string }> = {
  amenity: { dot: '#06B6D4', chip: '#CFFAFE', ring: '#0891B2' },
  gate: { dot: '#DC2626', chip: '#FEE2E2', ring: '#B91C1C' },
  commercial: { dot: '#F59E0B', chip: '#FEF3C7', ring: '#D97706' },
};

export const CATEGORY_ORDER: HotspotCategory[] = ['amenity', 'gate', 'commercial'];

export const MAP_HOTSPOTS: ReadonlyArray<MapHotspot> = [
  // ─── Gates ─────────────────────────────────────────────────────────────
  {
    id: 'gate-main',
    category: 'gate',
    nameKey: 'services.compoundMap.hotspots.gate-main.name',
    subKey: 'services.compoundMap.hotspots.gate-main.sub',
    icon: ShieldCheck,
    x: 0.5,
    y: 0.93,
    actions: { directions: true, callTel: '+20223456789' },
  },
  {
    id: 'gate-north',
    category: 'gate',
    nameKey: 'services.compoundMap.hotspots.gate-north.name',
    subKey: 'services.compoundMap.hotspots.gate-north.sub',
    icon: ShieldCheck,
    x: 0.5,
    y: 0.08,
    actions: { directions: true, callTel: '+20223456790' },
  },
  {
    id: 'gate-service',
    category: 'gate',
    nameKey: 'services.compoundMap.hotspots.gate-service.name',
    subKey: 'services.compoundMap.hotspots.gate-service.sub',
    icon: ShieldCheck,
    x: 0.92,
    y: 0.5,
    actions: { directions: true, callTel: '+20223456791' },
  },

  // ─── Amenities ─────────────────────────────────────────────────────────
  {
    id: 'clubhouse',
    category: 'amenity',
    nameKey: 'services.compoundMap.hotspots.clubhouse.name',
    subKey: 'services.compoundMap.hotspots.clubhouse.sub',
    icon: Building2,
    x: 0.34,
    y: 0.45,
    actions: { directions: true, bookHref: '/services/wellness', learnMore: true },
  },
  {
    id: 'pool-adult',
    category: 'amenity',
    nameKey: 'services.compoundMap.hotspots.pool-adult.name',
    subKey: 'services.compoundMap.hotspots.pool-adult.sub',
    icon: Waves,
    x: 0.28,
    y: 0.55,
    actions: { directions: true, bookHref: '/services/wellness' },
  },
  {
    id: 'pool-kids',
    category: 'amenity',
    nameKey: 'services.compoundMap.hotspots.pool-kids.name',
    subKey: 'services.compoundMap.hotspots.pool-kids.sub',
    icon: Waves,
    x: 0.4,
    y: 0.58,
    actions: { directions: true },
  },
  {
    id: 'gym-spa',
    category: 'amenity',
    nameKey: 'services.compoundMap.hotspots.gym-spa.name',
    subKey: 'services.compoundMap.hotspots.gym-spa.sub',
    icon: Dumbbell,
    x: 0.35,
    y: 0.32,
    actions: { directions: true, bookHref: '/services/wellness', learnMore: true },
  },
  {
    id: 'park',
    category: 'amenity',
    nameKey: 'services.compoundMap.hotspots.park.name',
    subKey: 'services.compoundMap.hotspots.park.sub',
    icon: Trees,
    x: 0.55,
    y: 0.52,
    actions: { directions: true },
  },
  {
    id: 'playground',
    category: 'amenity',
    nameKey: 'services.compoundMap.hotspots.playground.name',
    subKey: 'services.compoundMap.hotspots.playground.sub',
    icon: Gamepad2,
    x: 0.62,
    y: 0.65,
    actions: { directions: true },
  },
  {
    id: 'yoga-lawn',
    category: 'amenity',
    nameKey: 'services.compoundMap.hotspots.yoga-lawn.name',
    subKey: 'services.compoundMap.hotspots.yoga-lawn.sub',
    icon: Flower2,
    x: 0.48,
    y: 0.68,
    actions: { directions: true, bookHref: '/services/wellness' },
  },

  // ─── Commercial ────────────────────────────────────────────────────────
  {
    id: 'outlets-plaza',
    category: 'commercial',
    nameKey: 'services.compoundMap.hotspots.outlets-plaza.name',
    subKey: 'services.compoundMap.hotspots.outlets-plaza.sub',
    icon: ShoppingBag,
    x: 0.75,
    y: 0.42,
    actions: { directions: true, learnMore: true },
  },
  {
    id: 'cafes-row',
    category: 'commercial',
    nameKey: 'services.compoundMap.hotspots.cafes-row.name',
    subKey: 'services.compoundMap.hotspots.cafes-row.sub',
    icon: Coffee,
    x: 0.78,
    y: 0.55,
    actions: { directions: true, learnMore: true },
  },
  {
    id: 'pharmacy',
    category: 'commercial',
    nameKey: 'services.compoundMap.hotspots.pharmacy.name',
    subKey: 'services.compoundMap.hotspots.pharmacy.sub',
    icon: PillBottle,
    x: 0.82,
    y: 0.32,
    actions: { directions: true, callTel: '+20223456792', bookHref: '/services/daily-delivery' },
  },
  {
    id: 'supermarket',
    category: 'commercial',
    nameKey: 'services.compoundMap.hotspots.supermarket.name',
    subKey: 'services.compoundMap.hotspots.supermarket.sub',
    icon: ShoppingCart,
    x: 0.74,
    y: 0.68,
    actions: { directions: true, bookHref: '/services/daily-delivery' },
  },
  {
    id: 'petrol',
    category: 'commercial',
    nameKey: 'services.compoundMap.hotspots.petrol.name',
    subKey: 'services.compoundMap.hotspots.petrol.sub',
    icon: Fuel,
    x: 0.86,
    y: 0.78,
    actions: { directions: true },
  },
];
