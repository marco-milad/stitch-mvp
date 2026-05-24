// Compound-owned wellness amenities (Gym, Spa, Group Classes). Unlike the
// external service-provider model (Cleaning, Laundry, etc.), these are
// in-compound assets — single facility, multiple bookable session types.
// Bookings still flow through serviceRequestsStore with pseudo tile-ids
// `wellness-gym` / `wellness-spa` / `wellness-classes`.

import { Dumbbell, Flower2, Sparkles, type LucideIcon } from 'lucide-react';

export type WellnessFacilityId = 'gym' | 'spa' | 'classes';

export interface WellnessFacility {
  id: WellnessFacilityId;
  /** Pseudo tile-id used when storing a request via serviceRequestsStore. */
  bookingTileId: `wellness-${WellnessFacilityId}`;
  nameKey: string;
  subKey: string;
  icon: LucideIcon;
  /** Gradient backdrop for hub + facility-detail hero. */
  gradient: { from: string; to: string };
  /** Optional Unsplash photo for the hub card. Falls back to gradient+icon when absent. */
  imageUrl?: string;
}

export interface WellnessSession {
  id: string;
  facilityId: WellnessFacilityId;
  /** i18n key — resolves to a flat `services.offerings.wellness-sessions.<id>` string,
   *  matching the existing service-offering pattern so the shared
   *  `offeringLabelKey()` resolver works without special-casing. */
  titleKey: string;
  /** Optional — many sessions have a named instructor; others don't. */
  instructorKey?: string;
  durationMin: number;
  priceEgp: number;
  /** Coarse availability hint shown on the session card. */
  scheduleKey?: string;
}

export const WELLNESS_FACILITIES: ReadonlyArray<WellnessFacility> = [
  {
    id: 'gym',
    bookingTileId: 'wellness-gym',
    nameKey: 'wellness.facilities.gym.name',
    subKey: 'wellness.facilities.gym.sub',
    icon: Dumbbell,
    gradient: { from: '#0F172A', to: '#1E40AF' },
  },
  {
    id: 'spa',
    bookingTileId: 'wellness-spa',
    nameKey: 'wellness.facilities.spa.name',
    subKey: 'wellness.facilities.spa.sub',
    icon: Sparkles,
    gradient: { from: '#7C2D12', to: '#EC4899' },
    // Reuses the verified Unsplash URL already in DISCOVER_STORIES (story.wellness).
    imageUrl:
      'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'classes',
    bookingTileId: 'wellness-classes',
    nameKey: 'wellness.facilities.classes.name',
    subKey: 'wellness.facilities.classes.sub',
    icon: Flower2,
    gradient: { from: '#065F46', to: '#10B981' },
  },
];

export const WELLNESS_SESSIONS: ReadonlyArray<WellnessSession> = [
  // ─── Gym ───────────────────────────────────────────────────────────────
  {
    id: 'personal-training',
    facilityId: 'gym',
    titleKey: 'services.offerings.wellness-sessions.personal-training',
    instructorKey: 'wellness.instructors.omar',
    durationMin: 60,
    priceEgp: 350,
    scheduleKey: 'wellness.schedule.byAppointment',
  },
  {
    id: 'group-strength',
    facilityId: 'gym',
    titleKey: 'services.offerings.wellness-sessions.group-strength',
    durationMin: 45,
    priceEgp: 120,
    scheduleKey: 'wellness.schedule.mwf18',
  },
  {
    id: 'cardio-coaching',
    facilityId: 'gym',
    titleKey: 'services.offerings.wellness-sessions.cardio-coaching',
    instructorKey: 'wellness.instructors.tarek',
    durationMin: 45,
    priceEgp: 150,
    scheduleKey: 'wellness.schedule.tueThu7',
  },

  // ─── Spa ───────────────────────────────────────────────────────────────
  {
    id: 'hot-stone-massage',
    facilityId: 'spa',
    titleKey: 'services.offerings.wellness-sessions.hot-stone-massage',
    durationMin: 60,
    priceEgp: 600,
    scheduleKey: 'wellness.schedule.tueSun',
  },
  {
    id: 'hammam',
    facilityId: 'spa',
    titleKey: 'services.offerings.wellness-sessions.hammam',
    durationMin: 90,
    priceEgp: 500,
    scheduleKey: 'wellness.schedule.tueSun',
  },
  {
    id: 'facial',
    facilityId: 'spa',
    titleKey: 'services.offerings.wellness-sessions.facial',
    instructorKey: 'wellness.instructors.nada',
    durationMin: 45,
    priceEgp: 400,
    scheduleKey: 'wellness.schedule.daily',
  },
  {
    id: 'couples-massage',
    facilityId: 'spa',
    titleKey: 'services.offerings.wellness-sessions.couples-massage',
    durationMin: 90,
    priceEgp: 1000,
    scheduleKey: 'wellness.schedule.byAppointment',
  },

  // ─── Classes ───────────────────────────────────────────────────────────
  {
    id: 'hatha-yoga',
    facilityId: 'classes',
    titleKey: 'services.offerings.wellness-sessions.hatha-yoga',
    instructorKey: 'wellness.instructors.layla',
    durationMin: 60,
    priceEgp: 80,
    scheduleKey: 'wellness.schedule.dailyMornings',
  },
  {
    id: 'vinyasa-flow',
    facilityId: 'classes',
    titleKey: 'services.offerings.wellness-sessions.vinyasa-flow',
    instructorKey: 'wellness.instructors.layla',
    durationMin: 60,
    priceEgp: 100,
    scheduleKey: 'wellness.schedule.mwf18',
  },
  {
    id: 'hiit',
    facilityId: 'classes',
    titleKey: 'services.offerings.wellness-sessions.hiit',
    instructorKey: 'wellness.instructors.tarek',
    durationMin: 45,
    priceEgp: 90,
    scheduleKey: 'wellness.schedule.tueThu7',
  },
  {
    id: 'pilates',
    facilityId: 'classes',
    titleKey: 'services.offerings.wellness-sessions.pilates',
    durationMin: 60,
    priceEgp: 100,
    scheduleKey: 'wellness.schedule.weekday10',
  },
  {
    id: 'zumba',
    facilityId: 'classes',
    titleKey: 'services.offerings.wellness-sessions.zumba',
    durationMin: 45,
    priceEgp: 80,
    scheduleKey: 'wellness.schedule.satEvening',
  },
  {
    id: 'aqua-aerobics',
    facilityId: 'classes',
    titleKey: 'services.offerings.wellness-sessions.aqua-aerobics',
    durationMin: 45,
    priceEgp: 100,
    scheduleKey: 'wellness.schedule.sunFri',
  },
];

export function getFacility(id: WellnessFacilityId | string): WellnessFacility | undefined {
  return WELLNESS_FACILITIES.find((f) => f.id === id);
}

export function getSessionsForFacility(id: WellnessFacilityId): WellnessSession[] {
  return WELLNESS_SESSIONS.filter((s) => s.facilityId === id);
}

export function getSessionById(id: string): WellnessSession | undefined {
  return WELLNESS_SESSIONS.find((s) => s.id === id);
}
