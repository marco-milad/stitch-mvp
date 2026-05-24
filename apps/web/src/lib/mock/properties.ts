// Mock multi-property portfolio for an owner-resident. Used by the Home tab
// + UnitSwitcher until apps/api exposes GET /api/v1/users/me/properties.

import type { Property } from '@/lib/schemas/property';

export const MOCK_PROPERTIES: ReadonlyArray<Property> = [
  {
    id: 'prop-1',
    compoundSlug: 'madinet-masr',
    compoundName: 'Madinet Masr',
    unitName: 'Villa 12',
    unitType: 'villa',
    areaM2: 350,
    bedrooms: 4,
    ownership: 'owner',
    handoverStatus: 'delivered',
    handoverDate: '2024-03-15',
    primary: true,
    zone: 'phase1',
  },
  {
    id: 'prop-2',
    compoundSlug: 'madinet-masr',
    compoundName: 'Madinet Masr',
    unitName: 'Apt B-4-302',
    unitType: 'apartment',
    building: 'B-4',
    areaM2: 130,
    bedrooms: 2,
    ownership: 'owner',
    handoverStatus: 'delivered',
    handoverDate: '2025-09-01',
    primary: false,
    zone: 'tajSultan',
  },
  {
    id: 'prop-3',
    compoundSlug: 'madinet-masr-sahel',
    compoundName: 'Sahel · Beachfront',
    unitName: 'Chalet 18',
    unitType: 'townhouse',
    areaM2: 220,
    bedrooms: 3,
    ownership: 'owner',
    handoverStatus: 'under-construction',
    handoverDate: '2027-06-30',
    primary: false,
    zone: 'sahel',
  },
];
