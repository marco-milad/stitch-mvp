// Initial family rosters per property. The Hegazi household (Villa 12)
// covers the four-role spread: co-owner / resident / child / guest.
// Apt B-4-302 is a single-tenant scenario. Chalet 18 is empty (under-construction).
// TODO: API — GET /api/v1/properties/:id/family in Week 5+.

import { DEFAULT_PERMISSIONS, pickAvatarColor, type FamilyMember } from '@/lib/schemas/family';

export const MOCK_SEED_MEMBERS: ReadonlyArray<FamilyMember> = [
  {
    id: 'fam-mona',
    propertyId: 'prop-1',
    fullName: 'Mona Hegazi',
    phoneNumber: '+20 100 111 1111',
    email: 'mona@example.com',
    role: 'co-owner',
    permissions: DEFAULT_PERMISSIONS['co-owner'],
    status: 'active',
    avatarColor: pickAvatarColor('fam-mona'),
    invitedAt: '2024-01-15T10:00:00.000Z',
    activatedAt: '2024-01-15T10:05:00.000Z',
  },
  {
    id: 'fam-youssef',
    propertyId: 'prop-1',
    fullName: 'Youssef Hegazi',
    phoneNumber: '+20 100 222 2222',
    email: 'youssef@example.com',
    role: 'resident',
    permissions: DEFAULT_PERMISSIONS.resident,
    status: 'active',
    avatarColor: pickAvatarColor('fam-youssef'),
    invitedAt: '2024-01-15T10:10:00.000Z',
    activatedAt: '2024-01-16T08:30:00.000Z',
  },
  {
    id: 'fam-lara',
    propertyId: 'prop-1',
    fullName: 'Lara Hegazi',
    phoneNumber: '+20 100 333 3333',
    email: '',
    role: 'child',
    permissions: DEFAULT_PERMISSIONS.child,
    status: 'active',
    avatarColor: pickAvatarColor('fam-lara'),
    invitedAt: '2024-02-01T14:00:00.000Z',
    activatedAt: '2024-02-01T18:42:00.000Z',
  },
  {
    id: 'fam-samia',
    propertyId: 'prop-1',
    fullName: 'Aunt Samia',
    phoneNumber: '+20 100 444 4444',
    email: '',
    role: 'guest',
    permissions: DEFAULT_PERMISSIONS.guest,
    status: 'pending',
    avatarColor: pickAvatarColor('fam-samia'),
    invitedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), // ~18h ago
    activatedAt: null,
  },
  {
    id: 'fam-hossam',
    propertyId: 'prop-2',
    fullName: 'Hossam Tarek',
    phoneNumber: '+20 100 555 5555',
    email: 'hossam@example.com',
    role: 'co-owner',
    permissions: DEFAULT_PERMISSIONS['co-owner'],
    status: 'active',
    avatarColor: pickAvatarColor('fam-hossam'),
    invitedAt: '2024-09-01T09:00:00.000Z',
    activatedAt: '2024-09-01T09:08:00.000Z',
  },
];
