// Seed requests used to populate the user's history on first load so the
// Home "Open requests" pill + active-request card have realistic content
// before any booking is made.

import type { ServiceRequest } from '@/lib/schemas/serviceRequest';

export const MOCK_SEED_REQUESTS: ReadonlyArray<ServiceRequest> = [
  {
    id: 'req-seed-1',
    tileId: 'daily-home',
    providerId: 'prov-home-1',
    offeringKey: 'plumbing',
    dateIso: nextDayIso(1),
    timeSlot: '11:00',
    notes: 'Kitchen sink slow drain',
    propertyId: 'prop-1',
    status: 'confirmed',
    createdAt: now(),
    consent: true,
  },
  {
    id: 'req-seed-2',
    tileId: 'daily-cleaning',
    providerId: 'prov-clean-1',
    offeringKey: 'deep',
    dateIso: nextDayIso(3),
    timeSlot: '09:00',
    notes: '',
    propertyId: 'prop-1',
    status: 'pending',
    createdAt: now(),
    consent: true,
  },
  {
    id: 'req-seed-3',
    tileId: 'daily-laundry',
    providerId: 'prov-laundry-1',
    offeringKey: 'regular',
    dateIso: nextDayIso(0),
    timeSlot: '15:00',
    notes: '2 bags · doorman pickup',
    propertyId: 'prop-1',
    status: 'in-progress',
    createdAt: now(),
    consent: true,
  },
];

function now(): string {
  return new Date().toISOString();
}

function nextDayIso(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}
