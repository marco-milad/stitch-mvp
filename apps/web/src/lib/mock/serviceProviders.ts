// Service providers per bookable tile. Each entry mocks a vetted vendor
// available inside the compound. Offering keys index into
// `services.offerings.<tileSuffix>.<key>` for the display label.
// TODO: API — GET /api/v1/services/:tileId/providers in Week 4.

export interface ProviderOffering {
  key: string; // i18n suffix, e.g. 'regular', 'deep', 'walk'
  durationMin: number;
  priceEgp: number;
}

export interface ServiceProvider {
  id: string;
  tileId: string;
  name: string;
  rating: number;
  reviewsCount: number;
  responseTimeMin: number;
  languages: ReadonlyArray<'en' | 'ar' | 'fr'>;
  /** i18n key — e.g. 'services.providers.badges.verified'. */
  badgeKey?: string;
  offerings: ReadonlyArray<ProviderOffering>;
}

/** Computed cheapest offering price — single source for "from EGP X" displays. */
export function priceFromEgp(provider: ServiceProvider): number {
  return Math.min(...provider.offerings.map((o) => o.priceEgp));
}

/** Maps a tile id → i18n namespace under `services.offerings.<ns>.*`.
 *  Wellness pseudo-tiles all resolve to the same `wellness-sessions`
 *  namespace because session keys are unique across facilities. */
const TILE_TO_OFFERING_NS: Record<string, string> = {
  'daily-cleaning': 'cleaning',
  'daily-laundry': 'laundry',
  'daily-delivery': 'delivery',
  'daily-pet': 'pet',
  'daily-home': 'home',
  'daily-gardening': 'gardening',
  'daily-security-guard': 'securityGuard',
  'wellness-gym': 'wellness-sessions',
  'wellness-spa': 'wellness-sessions',
  'wellness-classes': 'wellness-sessions',
};

export function offeringLabelKey(tileId: string, offeringKey: string): string {
  const ns = TILE_TO_OFFERING_NS[tileId] ?? tileId;
  return `services.offerings.${ns}.${offeringKey}`;
}

export const SERVICE_PROVIDERS: ReadonlyArray<ServiceProvider> = [
  // ─── Cleaning ──────────────────────────────────────────────────────────
  {
    id: 'prov-clean-1',
    tileId: 'daily-cleaning',
    name: 'Cairo Sparkle Cleaning',
    rating: 4.7,
    reviewsCount: 327,
    responseTimeMin: 30,
    languages: ['en', 'ar'],
    badgeKey: 'services.providers.badges.topRated',
    offerings: [
      { key: 'regular', durationMin: 120, priceEgp: 250 },
      { key: 'deep', durationMin: 240, priceEgp: 600 },
      { key: 'postEvent', durationMin: 180, priceEgp: 450 },
    ],
  },
  {
    id: 'prov-clean-2',
    tileId: 'daily-cleaning',
    name: 'Madinet Home Care',
    rating: 4.5,
    reviewsCount: 184,
    responseTimeMin: 45,
    languages: ['ar'],
    badgeKey: 'services.providers.badges.verified',
    offerings: [
      { key: 'regular', durationMin: 120, priceEgp: 220 },
      { key: 'deep', durationMin: 240, priceEgp: 550 },
    ],
  },
  {
    id: 'prov-clean-3',
    tileId: 'daily-cleaning',
    name: 'New Cairo Maids',
    rating: 4.2,
    reviewsCount: 62,
    responseTimeMin: 90,
    languages: ['en', 'ar'],
    badgeKey: 'services.providers.badges.new',
    offerings: [
      { key: 'regular', durationMin: 120, priceEgp: 180 },
      { key: 'postEvent', durationMin: 180, priceEgp: 400 },
    ],
  },

  // ─── Laundry ───────────────────────────────────────────────────────────
  {
    id: 'prov-laundry-1',
    tileId: 'daily-laundry',
    name: 'Press & Fold Express',
    rating: 4.8,
    reviewsCount: 412,
    responseTimeMin: 20,
    languages: ['en', 'ar'],
    badgeKey: 'services.providers.badges.topRated',
    offerings: [
      { key: 'regular', durationMin: 1440, priceEgp: 120 },
      { key: 'delicate', durationMin: 2880, priceEgp: 220 },
      { key: 'bulk', durationMin: 2880, priceEgp: 400 },
    ],
  },
  {
    id: 'prov-laundry-2',
    tileId: 'daily-laundry',
    name: 'White Rose Dry Cleaning',
    rating: 4.4,
    reviewsCount: 98,
    responseTimeMin: 60,
    languages: ['en', 'ar'],
    badgeKey: 'services.providers.badges.verified',
    offerings: [
      { key: 'regular', durationMin: 2880, priceEgp: 150 },
      { key: 'delicate', durationMin: 4320, priceEgp: 280 },
    ],
  },
  {
    id: 'prov-laundry-3',
    tileId: 'daily-laundry',
    name: 'Compound Wash Co.',
    rating: 4.1,
    reviewsCount: 34,
    responseTimeMin: 45,
    languages: ['ar'],
    offerings: [{ key: 'bulk', durationMin: 1440, priceEgp: 350 }],
  },

  // ─── Delivery ──────────────────────────────────────────────────────────
  {
    id: 'prov-delivery-1',
    tileId: 'daily-delivery',
    name: 'GoDash Couriers',
    rating: 4.6,
    reviewsCount: 612,
    responseTimeMin: 15,
    languages: ['en', 'ar'],
    badgeKey: 'services.providers.badges.topRated',
    offerings: [
      { key: 'express', durationMin: 30, priceEgp: 50 },
      { key: 'scheduled', durationMin: 120, priceEgp: 30 },
    ],
  },
  {
    id: 'prov-delivery-2',
    tileId: 'daily-delivery',
    name: 'Madinet Mart Direct',
    rating: 4.3,
    reviewsCount: 215,
    responseTimeMin: 25,
    languages: ['ar'],
    badgeKey: 'services.providers.badges.verified',
    offerings: [
      { key: 'express', durationMin: 45, priceEgp: 40 },
      { key: 'scheduled', durationMin: 180, priceEgp: 20 },
    ],
  },
  {
    id: 'prov-delivery-3',
    tileId: 'daily-delivery',
    name: 'PharmRun',
    rating: 4.7,
    reviewsCount: 89,
    responseTimeMin: 20,
    languages: ['en', 'ar'],
    offerings: [{ key: 'express', durationMin: 30, priceEgp: 35 }],
  },

  // ─── Pet Services ──────────────────────────────────────────────────────
  {
    id: 'prov-pet-1',
    tileId: 'daily-pet',
    name: 'Paws & Tails Care',
    rating: 4.9,
    reviewsCount: 156,
    responseTimeMin: 60,
    languages: ['en', 'ar'],
    badgeKey: 'services.providers.badges.topRated',
    offerings: [
      { key: 'walk', durationMin: 45, priceEgp: 80 },
      { key: 'grooming', durationMin: 90, priceEgp: 250 },
      { key: 'vet', durationMin: 60, priceEgp: 350 },
    ],
  },
  {
    id: 'prov-pet-2',
    tileId: 'daily-pet',
    name: 'Compound Vets',
    rating: 4.6,
    reviewsCount: 73,
    responseTimeMin: 30,
    languages: ['en', 'ar'],
    badgeKey: 'services.providers.badges.verified',
    offerings: [
      { key: 'vet', durationMin: 60, priceEgp: 400 },
      { key: 'grooming', durationMin: 75, priceEgp: 220 },
    ],
  },
  {
    id: 'prov-pet-3',
    tileId: 'daily-pet',
    name: 'Happy Walkers',
    rating: 4.4,
    reviewsCount: 28,
    responseTimeMin: 90,
    languages: ['ar'],
    offerings: [{ key: 'walk', durationMin: 30, priceEgp: 60 }],
  },

  // ─── Home Services (Maintenance) ───────────────────────────────────────
  {
    id: 'prov-home-1',
    tileId: 'daily-home',
    name: 'FixIt Pros',
    rating: 4.7,
    reviewsCount: 421,
    responseTimeMin: 45,
    languages: ['en', 'ar'],
    badgeKey: 'services.providers.badges.topRated',
    offerings: [
      { key: 'plumbing', durationMin: 60, priceEgp: 200 },
      { key: 'electrical', durationMin: 60, priceEgp: 220 },
      { key: 'handyman', durationMin: 120, priceEgp: 300 },
    ],
  },
  {
    id: 'prov-home-2',
    tileId: 'daily-home',
    name: 'PestAway Egypt',
    rating: 4.5,
    reviewsCount: 137,
    responseTimeMin: 90,
    languages: ['en', 'ar'],
    badgeKey: 'services.providers.badges.verified',
    offerings: [{ key: 'pest', durationMin: 90, priceEgp: 350 }],
  },
  {
    id: 'prov-home-3',
    tileId: 'daily-home',
    name: 'Madinet Maintenance Co.',
    rating: 4.3,
    reviewsCount: 88,
    responseTimeMin: 60,
    languages: ['ar'],
    offerings: [
      { key: 'plumbing', durationMin: 60, priceEgp: 180 },
      { key: 'electrical', durationMin: 60, priceEgp: 200 },
    ],
  },

  // ─── Gardening (new) ───────────────────────────────────────────────────
  {
    id: 'prov-garden-1',
    tileId: 'daily-gardening',
    name: 'Greenline Landscapes',
    rating: 4.8,
    reviewsCount: 142,
    responseTimeMin: 120,
    languages: ['en', 'ar'],
    badgeKey: 'services.providers.badges.topRated',
    offerings: [
      { key: 'maintenance', durationMin: 90, priceEgp: 220 },
      { key: 'landscaping', durationMin: 240, priceEgp: 1500 },
      { key: 'treeCare', durationMin: 120, priceEgp: 600 },
    ],
  },
  {
    id: 'prov-garden-2',
    tileId: 'daily-gardening',
    name: 'Nile Gardens',
    rating: 4.5,
    reviewsCount: 67,
    responseTimeMin: 180,
    languages: ['ar'],
    badgeKey: 'services.providers.badges.verified',
    offerings: [
      { key: 'maintenance', durationMin: 90, priceEgp: 180 },
      { key: 'treeCare', durationMin: 120, priceEgp: 550 },
    ],
  },
  {
    id: 'prov-garden-3',
    tileId: 'daily-gardening',
    name: 'GardenGuru',
    rating: 4.3,
    reviewsCount: 19,
    responseTimeMin: 240,
    languages: ['en', 'ar'],
    badgeKey: 'services.providers.badges.new',
    offerings: [{ key: 'landscaping', durationMin: 180, priceEgp: 1200 }],
  },

  // ─── Security Guard (new) ──────────────────────────────────────────────
  {
    id: 'prov-sec-1',
    tileId: 'daily-security-guard',
    name: 'EliteWatch Security',
    rating: 4.7,
    reviewsCount: 95,
    responseTimeMin: 60,
    languages: ['en', 'ar'],
    badgeKey: 'services.providers.badges.topRated',
    offerings: [
      { key: 'event', durationMin: 360, priceEgp: 1200 },
      { key: 'patrol', durationMin: 240, priceEgp: 700 },
      { key: 'escort', durationMin: 60, priceEgp: 250 },
    ],
  },
  {
    id: 'prov-sec-2',
    tileId: 'daily-security-guard',
    name: 'Sentinel Compound Patrol',
    rating: 4.6,
    reviewsCount: 47,
    responseTimeMin: 90,
    languages: ['ar'],
    badgeKey: 'services.providers.badges.verified',
    offerings: [
      { key: 'patrol', durationMin: 240, priceEgp: 650 },
      { key: 'escort', durationMin: 60, priceEgp: 220 },
    ],
  },
  {
    id: 'prov-sec-3',
    tileId: 'daily-security-guard',
    name: 'Guard24',
    rating: 4.2,
    reviewsCount: 14,
    responseTimeMin: 120,
    languages: ['en', 'ar'],
    offerings: [{ key: 'event', durationMin: 480, priceEgp: 1500 }],
  },
];

export function getProvidersForTile(tileId: string): ServiceProvider[] {
  return SERVICE_PROVIDERS.filter((p) => p.tileId === tileId);
}

export function getProviderById(providerId: string): ServiceProvider | undefined {
  return SERVICE_PROVIDERS.find((p) => p.id === providerId);
}
