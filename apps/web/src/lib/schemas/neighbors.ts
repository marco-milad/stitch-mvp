// Neighbors directory — privacy-first resident look-up scoped to the
// current compound. Three independent privacy flags each gate a specific
// UI affordance (showUnit → unit blur; allowDirectMessages → button;
// isProfilePublic → entire card content).

export const NEIGHBOR_ROLE_VALUES = ['owner', 'tenant', 'family-member'] as const;
export type NeighborRole = (typeof NEIGHBOR_ROLE_VALUES)[number];

export const INTEREST_KEYS = [
  'football',
  'padel',
  'cycling',
  'yoga',
  'pets',
  'tech',
  'cars',
  'cooking',
  'music',
  'photography',
  'books',
  'fitness',
] as const;
export type Interest = (typeof INTEREST_KEYS)[number];

export const ZONE_KEYS = ['phase1', 'sarai', 'tajSultan', 'sahel'] as const;
export type Zone = (typeof ZONE_KEYS)[number];

/** Emoji + i18n key lookup so chips can render quickly without a switch. */
export const INTEREST_EMOJI: Record<Interest, string> = {
  football: '⚽',
  padel: '🎾',
  cycling: '🚴',
  yoga: '🧘',
  pets: '🐾',
  tech: '💻',
  cars: '🚗',
  cooking: '👨‍🍳',
  music: '🎵',
  photography: '📷',
  books: '📚',
  fitness: '🏋️',
};

export interface NeighborPrivacy {
  /** When false the unit number is rendered as a CSS blur block. */
  showUnit: boolean;
  /** When false the "Send Message" button is replaced with a "Messages disabled" caption. */
  allowDirectMessages: boolean;
  /** When false the whole card collapses to "Private resident" with no avatar / interests / actions. */
  isProfilePublic: boolean;
}

export interface Neighbor {
  id: string;
  name: string;
  unitName: string;
  zone: Zone;
  role: NeighborRole;
  interests: ReadonlyArray<Interest>;
  /** Optional bio i18n key — currently unused on the card, reserved for a future detail view. */
  bioKey?: string;
  privacy: NeighborPrivacy;
  /** Hex color from family.AVATAR_PALETTE — picked deterministically from id at seed time. */
  avatarColor: string;
}
