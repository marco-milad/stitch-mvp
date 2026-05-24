// Booking flow mock data: visit types, sales advisors, and slot availability.
// Slot availability is a pure function of (date, visitType) so the calendar
// can preview which days have slots without round-tripping a backend.

import { Building, MapPin, Video, type LucideIcon } from 'lucide-react';

import type { VisitType } from '@/lib/schemas/booking';

export interface VisitTypeOption {
  value: VisitType;
  labelKey: string;
  subKey: string;
  icon: LucideIcon;
}

export const VISIT_TYPES: ReadonlyArray<VisitTypeOption> = [
  {
    value: 'showroom',
    labelKey: 'discover.book.options.visitTypes.showroom',
    subKey: 'discover.book.options.visitTypes.showroomSub',
    icon: Building,
  },
  {
    value: 'virtual',
    labelKey: 'discover.book.options.visitTypes.virtual',
    subKey: 'discover.book.options.visitTypes.virtualSub',
    icon: Video,
  },
  {
    value: 'onsite',
    labelKey: 'discover.book.options.visitTypes.onsite',
    subKey: 'discover.book.options.visitTypes.onsiteSub',
    icon: MapPin,
  },
];

export interface Advisor {
  id: string;
  name: string;
  initials: string;
  specialtyKey: string;
  languages: ReadonlyArray<'en' | 'ar' | 'fr'>;
}

export const ADVISORS: ReadonlyArray<Advisor> = [
  {
    id: 'a-omar',
    name: 'Omar El-Sayed',
    initials: 'OS',
    specialtyKey: 'discover.book.specialties.villas',
    languages: ['en', 'ar'],
  },
  {
    id: 'a-nada',
    name: 'Nada Hassan',
    initials: 'NH',
    specialtyKey: 'discover.book.specialties.apartments',
    languages: ['en', 'ar', 'fr'],
  },
  {
    id: 'a-tarek',
    name: 'Tarek Farouk',
    initials: 'TF',
    specialtyKey: 'discover.book.specialties.investments',
    languages: ['en', 'ar'],
  },
];

export const ANY_ADVISOR_ID = 'ANY';

// ─── Slot availability ──────────────────────────────────────────────────────

const SHOWROOM_SLOTS = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
const VIRTUAL_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
];
const ONSITE_SLOTS = ['09:30', '11:00', '14:00', '16:00'];

/**
 * Returns available `'HH:MM'` start strings for a (date, visitType) combo.
 * Showroom + onsite skip Fridays (Egyptian weekend). Virtual runs daily.
 * Deterministic — no randomness, so the calendar can mirror this preview.
 */
export function availableSlots(date: Date, visitType: VisitType): string[] {
  if (isPast(date)) return [];
  const isFriday = date.getDay() === 5;

  switch (visitType) {
    case 'showroom':
      return isFriday ? [] : SHOWROOM_SLOTS;
    case 'virtual':
      return VIRTUAL_SLOTS;
    case 'onsite':
      return isFriday ? [] : ONSITE_SLOTS;
  }
}

export function isDateBookable(date: Date, visitType: VisitType): boolean {
  return availableSlots(date, visitType).length > 0;
}

function isPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

/** Format a slot as a display range "HH:MM – HH:45". 45-minute slots. */
export function formatSlotRange(slot: string): string {
  const [hStr, mStr] = slot.split(':');
  const hour = Number(hStr);
  const minute = Number(mStr);
  const endMinute = minute + 45;
  const endHour = hour + Math.floor(endMinute / 60);
  const endMin = endMinute % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hour)}:${pad(minute)} – ${pad(endHour)}:${pad(endMin)}`;
}
