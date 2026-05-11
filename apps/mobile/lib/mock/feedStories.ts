// Mock community stories. Mirrors public/index.html FEED_STORIES.
// TODO: API — replace with GET /api/v1/stories in Week 2.

export type StoryVisual = 'water' | 'zen' | 'fire' | 'leaves' | 'sparkle';

export interface FeedStory {
  id: string;
  emoji: string;
  label: string;
  time: string;
  visual: StoryVisual;
  title: string;
  sub: string;
}

export const FEED_STORIES: FeedStory[] = [
  {
    id: 's1',
    emoji: '🏊',
    label: 'Pool Party',
    time: 'Fri 8 PM',
    visual: 'water',
    title: 'Summer Splash',
    sub: 'Friday · 8 PM · Main Pool',
  },
  {
    id: 's2',
    emoji: '🧘',
    label: 'Yoga Class',
    time: 'Sat 7 AM',
    visual: 'zen',
    title: 'Saturday Yoga',
    sub: '7 AM · Central Garden',
  },
  {
    id: 's3',
    emoji: '🎬',
    label: 'Cinema Night',
    time: 'Thu 9 PM',
    visual: 'sparkle',
    title: 'Cinema Under Stars',
    sub: 'Thursday · 9 PM · Amphitheater',
  },
  {
    id: 's4',
    emoji: '💪',
    label: 'New Gym',
    time: 'Now open',
    visual: 'fire',
    title: 'Gym Just Got Bigger',
    sub: 'New equipment · Open daily',
  },
  {
    id: 's5',
    emoji: '🌱',
    label: 'Garden Day',
    time: 'Sun 10 AM',
    visual: 'leaves',
    title: 'Community Garden',
    sub: 'Plant your own plot',
  },
  {
    id: 's6',
    emoji: '⭐',
    label: 'Top Resident',
    time: 'This week',
    visual: 'sparkle',
    title: 'Resident Spotlight',
    sub: 'Hossam el Sayed · Villa 14',
  },
];

export const VISUAL_PALETTE: Record<StoryVisual, { from: string; to: string }> = {
  water: { from: '#0EA5E9', to: '#1D4ED8' },
  zen: { from: '#EC4899', to: '#7C3AED' },
  fire: { from: '#F97316', to: '#DC2626' },
  leaves: { from: '#34D399', to: '#059669' },
  sparkle: { from: '#FBBF24', to: '#F59E0B' },
};
