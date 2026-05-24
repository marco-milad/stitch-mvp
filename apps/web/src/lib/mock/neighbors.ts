// 14 neighbors across the 4 Madinet Masr zones with a deliberate
// privacy-flag mix so every UI state has at least 2 examples visible on a
// fresh load. Avatar colors come from family.AVATAR_PALETTE via the same
// deterministic-from-id picker — keeps the shared visual language across
// Family + Neighbors.

import { pickAvatarColor } from '@/lib/schemas/family';
import type { Neighbor } from '@/lib/schemas/neighbors';

export const MOCK_NEIGHBORS: ReadonlyArray<Neighbor> = [
  // ─── Phase 1 (matches Villa 12, the primary property) ──────────────────
  {
    id: 'n-ahmed-tarek',
    name: 'Ahmed Tarek',
    unitName: 'Villa 14',
    zone: 'phase1',
    role: 'owner',
    interests: ['football', 'cars', 'tech'],
    privacy: { showUnit: true, allowDirectMessages: true, isProfilePublic: true },
    avatarColor: pickAvatarColor('n-ahmed-tarek'),
  },
  {
    id: 'n-mariam-saad',
    name: 'Mariam Saad',
    unitName: 'Villa 16',
    zone: 'phase1',
    role: 'owner',
    interests: ['yoga', 'cooking', 'photography'],
    privacy: { showUnit: false, allowDirectMessages: true, isProfilePublic: true },
    avatarColor: pickAvatarColor('n-mariam-saad'),
  },
  {
    id: 'n-karim-el-sayed',
    name: 'Karim El-Sayed',
    unitName: 'Villa 22',
    zone: 'phase1',
    role: 'tenant',
    interests: ['padel', 'cycling', 'fitness'],
    privacy: { showUnit: true, allowDirectMessages: true, isProfilePublic: true },
    avatarColor: pickAvatarColor('n-karim-el-sayed'),
  },
  {
    id: 'n-lina-mostafa',
    name: 'Lina Mostafa',
    unitName: 'Villa 9',
    zone: 'phase1',
    role: 'owner',
    interests: ['pets', 'books', 'music'],
    privacy: { showUnit: true, allowDirectMessages: false, isProfilePublic: true },
    avatarColor: pickAvatarColor('n-lina-mostafa'),
  },

  // ─── Sarai ──────────────────────────────────────────────────────────────
  {
    id: 'n-omar-hassan',
    name: 'Omar Hassan',
    unitName: 'Townhouse 31',
    zone: 'sarai',
    role: 'owner',
    interests: ['tech', 'cars', 'photography'],
    privacy: { showUnit: true, allowDirectMessages: true, isProfilePublic: true },
    avatarColor: pickAvatarColor('n-omar-hassan'),
  },
  {
    id: 'n-nada-farouk',
    name: 'Nada Farouk',
    unitName: 'Townhouse 28',
    zone: 'sarai',
    role: 'family-member',
    interests: ['yoga', 'cooking'],
    privacy: { showUnit: true, allowDirectMessages: false, isProfilePublic: false },
    avatarColor: pickAvatarColor('n-nada-farouk'),
  },
  {
    id: 'n-yousef-abdel-rahman',
    name: 'Yousef Abdel-Rahman',
    unitName: 'Townhouse 35',
    zone: 'sarai',
    role: 'owner',
    interests: ['football', 'fitness'],
    privacy: { showUnit: true, allowDirectMessages: true, isProfilePublic: true },
    avatarColor: pickAvatarColor('n-yousef-abdel-rahman'),
  },
  {
    id: 'n-salma-adel',
    name: 'Salma Adel',
    unitName: 'Townhouse 42',
    zone: 'sarai',
    role: 'tenant',
    interests: ['music', 'books', 'pets'],
    privacy: { showUnit: false, allowDirectMessages: false, isProfilePublic: true },
    avatarColor: pickAvatarColor('n-salma-adel'),
  },

  // ─── Taj Sultan (matches Apt B-4-302) ──────────────────────────────────
  {
    id: 'n-hossam-anwar',
    name: 'Hossam Anwar',
    unitName: 'Apt B-3-201',
    zone: 'tajSultan',
    role: 'owner',
    interests: ['cars', 'cycling'],
    privacy: { showUnit: true, allowDirectMessages: true, isProfilePublic: true },
    avatarColor: pickAvatarColor('n-hossam-anwar'),
  },
  {
    id: 'n-dina-mansour',
    name: 'Dina Mansour',
    unitName: 'Apt B-4-305',
    zone: 'tajSultan',
    role: 'owner',
    interests: ['photography', 'cooking', 'books'],
    privacy: { showUnit: true, allowDirectMessages: true, isProfilePublic: false },
    avatarColor: pickAvatarColor('n-dina-mansour'),
  },
  {
    id: 'n-rana-halim',
    name: 'Rana Halim',
    unitName: 'Apt B-5-110',
    zone: 'tajSultan',
    role: 'tenant',
    interests: ['padel', 'yoga'],
    privacy: { showUnit: true, allowDirectMessages: true, isProfilePublic: true },
    avatarColor: pickAvatarColor('n-rana-halim'),
  },
  {
    id: 'n-tarek-ibrahim',
    name: 'Tarek Ibrahim',
    unitName: 'Apt B-4-401',
    zone: 'tajSultan',
    role: 'owner',
    interests: ['football', 'music', 'tech'],
    privacy: { showUnit: true, allowDirectMessages: true, isProfilePublic: true },
    avatarColor: pickAvatarColor('n-tarek-ibrahim'),
  },

  // ─── Sahel (Chalet 18 is under-construction; these are the existing
  //     vacation-home residents who already took handover earlier) ─────────
  {
    id: 'n-aya-lotfy',
    name: 'Aya Lotfy',
    unitName: 'Chalet 12',
    zone: 'sahel',
    role: 'owner',
    interests: ['pets', 'yoga'],
    privacy: { showUnit: false, allowDirectMessages: false, isProfilePublic: false },
    avatarColor: pickAvatarColor('n-aya-lotfy'),
  },
  {
    id: 'n-sherif-hegazi',
    name: 'Sherif Hegazi',
    unitName: 'Chalet 14',
    zone: 'sahel',
    role: 'family-member',
    interests: ['cycling', 'books'],
    privacy: { showUnit: true, allowDirectMessages: true, isProfilePublic: true },
    avatarColor: pickAvatarColor('n-sherif-hegazi'),
  },
];
