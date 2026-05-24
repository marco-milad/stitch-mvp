// Discover tab data — Madinet Masr compound brochure for the Prospect view
// and tonight's-events surface for the Resident view.
// TODO: API — replace with GET /api/v1/discover/compounds/:slug in Week 2.

import {
  Building,
  Calendar,
  Compass,
  Eye,
  Film,
  Heart,
  MapPin,
  Sparkles,
  Trees,
  Waves,
  type LucideIcon,
} from 'lucide-react';

export type ZoneKind = 'residential' | 'amenity' | 'commercial' | 'future';

export interface Compound {
  slug: string;
  name: string;
  tagline: string;
  heroGradient: { from: string; to: string };
  heroImageUrl: string;
  primaryCtaKey: 'tour' | 'book';
}

export interface Hotspot {
  id: string;
  // Normalized 0..1 coordinates on the stage area.
  x: number;
  y: number;
  titleKey: string;
  descKey: string;
}

export interface TourStop {
  id: string;
  titleKey: string;
  subKey: string;
  icon: LucideIcon;
  durationMin: number;
  /** Brand-gradient fallback shown if the stop image fails to load. */
  stageGradient: { from: string; to: string };
  /** Premium architectural/lifestyle photo rendered behind the stage chrome. */
  imageUrl: string;
  hotspots: Hotspot[];
}

export interface MasterPlanZone {
  id: string;
  kind: ZoneKind;
  titleKey: string;
  subKey: string;
  icon: LucideIcon;
  // Normalized 0..1 coordinates on the master-plan image; consumed once the
  // SVG/image overlay lands later in Week 2.
  cx: number;
  cy: number;
}

export interface TonightEvent {
  id: string;
  titleKey: string;
  subKey: string;
  icon: LucideIcon;
  gradient: { from: string; to: string };
}

export interface OtherProject {
  id: string;
  titleKey: string;
  subKey: string;
  icon: LucideIcon;
}

export const COMPOUND: Compound = {
  slug: 'madinet-masr',
  name: 'Madinet Masr',
  tagline: 'A city built for everyday life — east of New Cairo.',
  heroGradient: { from: '#7C3AED', to: '#EC4899' },
  heroImageUrl:
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  primaryCtaKey: 'tour',
};

export const TOUR_STOPS: TourStop[] = [
  {
    id: 'gate',
    titleKey: 'discover.tour.gate.title',
    subKey: 'discover.tour.gate.sub',
    icon: Building,
    durationMin: 1,
    stageGradient: { from: '#0F172A', to: '#1E40AF' },
    imageUrl:
      'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=600&q=80',
    hotspots: [
      {
        id: 'security',
        x: 0.22,
        y: 0.62,
        titleKey: 'discover.tour.gate.hotspots.security.title',
        descKey: 'discover.tour.gate.hotspots.security.desc',
      },
      {
        id: 'welcome',
        x: 0.7,
        y: 0.45,
        titleKey: 'discover.tour.gate.hotspots.welcome.title',
        descKey: 'discover.tour.gate.hotspots.welcome.desc',
      },
    ],
  },
  {
    id: 'park',
    titleKey: 'discover.tour.park.title',
    subKey: 'discover.tour.park.sub',
    icon: Trees,
    durationMin: 2,
    stageGradient: { from: '#065F46', to: '#10B981' },
    imageUrl:
      'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=600&q=80',
    hotspots: [
      {
        id: 'trails',
        x: 0.32,
        y: 0.7,
        titleKey: 'discover.tour.park.hotspots.trails.title',
        descKey: 'discover.tour.park.hotspots.trails.desc',
      },
      {
        id: 'kids',
        x: 0.62,
        y: 0.55,
        titleKey: 'discover.tour.park.hotspots.kids.title',
        descKey: 'discover.tour.park.hotspots.kids.desc',
      },
      {
        id: 'lake',
        x: 0.82,
        y: 0.78,
        titleKey: 'discover.tour.park.hotspots.lake.title',
        descKey: 'discover.tour.park.hotspots.lake.desc',
      },
    ],
  },
  {
    id: 'clubhouse',
    titleKey: 'discover.tour.clubhouse.title',
    subKey: 'discover.tour.clubhouse.sub',
    icon: Waves,
    durationMin: 3,
    stageGradient: { from: '#0E7490', to: '#22D3EE' },
    imageUrl:
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80',
    hotspots: [
      {
        id: 'pool',
        x: 0.28,
        y: 0.5,
        titleKey: 'discover.tour.clubhouse.hotspots.pool.title',
        descKey: 'discover.tour.clubhouse.hotspots.pool.desc',
      },
      {
        id: 'gym',
        x: 0.55,
        y: 0.42,
        titleKey: 'discover.tour.clubhouse.hotspots.gym.title',
        descKey: 'discover.tour.clubhouse.hotspots.gym.desc',
      },
      {
        id: 'spa',
        x: 0.78,
        y: 0.6,
        titleKey: 'discover.tour.clubhouse.hotspots.spa.title',
        descKey: 'discover.tour.clubhouse.hotspots.spa.desc',
      },
    ],
  },
  {
    id: 'villa',
    titleKey: 'discover.tour.villa.title',
    subKey: 'discover.tour.villa.sub',
    icon: Eye,
    durationMin: 2,
    stageGradient: { from: '#7C2D12', to: '#F59E0B' },
    imageUrl:
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80',
    hotspots: [
      {
        id: 'living',
        x: 0.35,
        y: 0.55,
        titleKey: 'discover.tour.villa.hotspots.living.title',
        descKey: 'discover.tour.villa.hotspots.living.desc',
      },
      {
        id: 'garden',
        x: 0.72,
        y: 0.68,
        titleKey: 'discover.tour.villa.hotspots.garden.title',
        descKey: 'discover.tour.villa.hotspots.garden.desc',
      },
    ],
  },
];

export const KIND_COLOR: Record<ZoneKind, { dot: string; chip: string; ring: string }> = {
  residential: { dot: '#06B6D4', chip: '#CFFAFE', ring: '#0891B2' },
  amenity: { dot: '#10B981', chip: '#D1FAE5', ring: '#059669' },
  commercial: { dot: '#F59E0B', chip: '#FEF3C7', ring: '#D97706' },
  future: { dot: '#7C3AED', chip: '#EDE9FE', ring: '#6D28D9' },
};

export const KIND_LABEL_KEY: Record<ZoneKind, string> = {
  residential: 'discover.masterPlan.kinds.residential',
  amenity: 'discover.masterPlan.kinds.amenity',
  commercial: 'discover.masterPlan.kinds.commercial',
  future: 'discover.masterPlan.kinds.future',
};

/** Banner photo per kind; rendered atop the zone-detail panel. Future is intentionally null. */
export const KIND_IMAGE: Record<ZoneKind, string | null> = {
  residential:
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=500&q=80',
  amenity:
    'https://images.unsplash.com/photo-1416339442236-8ceb164046f8?auto=format&fit=crop&w=500&q=80',
  commercial:
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=500&q=80',
  future: null,
};

export const MASTER_PLAN_ZONES: MasterPlanZone[] = [
  {
    id: 'zone-a',
    kind: 'residential',
    titleKey: 'discover.zones.villas.title',
    subKey: 'discover.zones.villas.sub',
    icon: Building,
    cx: 0.28,
    cy: 0.34,
  },
  {
    id: 'zone-b',
    kind: 'residential',
    titleKey: 'discover.zones.apartments.title',
    subKey: 'discover.zones.apartments.sub',
    icon: Building,
    cx: 0.62,
    cy: 0.42,
  },
  {
    id: 'zone-c',
    kind: 'amenity',
    titleKey: 'discover.zones.clubhouse.title',
    subKey: 'discover.zones.clubhouse.sub',
    icon: Waves,
    cx: 0.5,
    cy: 0.6,
  },
  {
    id: 'zone-d',
    kind: 'commercial',
    titleKey: 'discover.zones.outlets.title',
    subKey: 'discover.zones.outlets.sub',
    icon: MapPin,
    cx: 0.78,
    cy: 0.72,
  },
  {
    id: 'zone-e',
    kind: 'future',
    titleKey: 'discover.zones.future.title',
    subKey: 'discover.zones.future.sub',
    icon: Compass,
    cx: 0.18,
    cy: 0.8,
  },
];

export const TONIGHT_EVENTS: TonightEvent[] = [
  {
    id: 'cinema',
    titleKey: 'discover.tonight.cinema.title',
    subKey: 'discover.tonight.cinema.sub',
    icon: Film,
    gradient: { from: '#06B6D4', to: '#7C3AED' },
  },
  {
    id: 'spa',
    titleKey: 'discover.tonight.spa.title',
    subKey: 'discover.tonight.spa.sub',
    icon: Heart,
    gradient: { from: '#EC4899', to: '#F97316' },
  },
  {
    id: 'yoga',
    titleKey: 'discover.tonight.yoga.title',
    subKey: 'discover.tonight.yoga.sub',
    icon: Sparkles,
    gradient: { from: '#10B981', to: '#06B6D4' },
  },
];

export const OTHER_PROJECTS: OtherProject[] = [
  {
    id: 'sahel',
    titleKey: 'discover.others.sahel.title',
    subKey: 'discover.others.sahel.sub',
    icon: Waves,
  },
  {
    id: 'gouna',
    titleKey: 'discover.others.gouna.title',
    subKey: 'discover.others.gouna.sub',
    icon: Compass,
  },
  {
    id: 'intl',
    titleKey: 'discover.others.intl.title',
    subKey: 'discover.others.intl.sub',
    icon: Calendar,
  },
];
