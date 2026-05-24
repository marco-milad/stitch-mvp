// Prospect-facing lifestyle stories for the Discover tab.
// Aspirational vignettes — "what it's like to live at Madinet Masr" —
// distinct from community/feedStories which are resident event posts.
// All strings as i18n keys; resolved by DiscoverStoryRail / DiscoverStory.

import type { StoryVisual } from '@/lib/mock/feedStories';

export interface DiscoverStorySeed {
  id: string;
  emoji: string;
  visual: StoryVisual;
  imageUrl: string;
  labelKey: string;
  titleKey: string;
  subKey: string;
  timeKey: string;
}

export const DISCOVER_STORIES: ReadonlyArray<DiscoverStorySeed> = [
  {
    id: 'morning',
    emoji: '☀️',
    visual: 'sparkle',
    imageUrl:
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80',
    labelKey: 'discover.stories.morning.label',
    titleKey: 'discover.stories.morning.title',
    subKey: 'discover.stories.morning.sub',
    timeKey: 'discover.stories.morning.time',
  },
  {
    id: 'clubhouse',
    emoji: '🏊',
    visual: 'water',
    imageUrl:
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=400&q=80',
    labelKey: 'discover.stories.clubhouse.label',
    titleKey: 'discover.stories.clubhouse.title',
    subKey: 'discover.stories.clubhouse.sub',
    timeKey: 'discover.stories.clubhouse.time',
  },
  {
    id: 'families',
    emoji: '👨‍👩‍👧',
    visual: 'zen',
    imageUrl:
      'https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?auto=format&fit=crop&w=400&q=80',
    labelKey: 'discover.stories.families.label',
    titleKey: 'discover.stories.families.title',
    subKey: 'discover.stories.families.sub',
    timeKey: 'discover.stories.families.time',
  },
  {
    id: 'cafes',
    emoji: '☕',
    visual: 'fire',
    imageUrl:
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80',
    labelKey: 'discover.stories.cafes.label',
    titleKey: 'discover.stories.cafes.title',
    subKey: 'discover.stories.cafes.sub',
    timeKey: 'discover.stories.cafes.time',
  },
  {
    id: 'sunset',
    emoji: '🌇',
    visual: 'leaves',
    imageUrl:
      'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=400&q=80',
    labelKey: 'discover.stories.sunset.label',
    titleKey: 'discover.stories.sunset.title',
    subKey: 'discover.stories.sunset.sub',
    timeKey: 'discover.stories.sunset.time',
  },
  {
    id: 'wellness',
    emoji: '🧘',
    visual: 'zen',
    imageUrl:
      'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=400&q=80',
    labelKey: 'discover.stories.wellness.label',
    titleKey: 'discover.stories.wellness.title',
    subKey: 'discover.stories.wellness.sub',
    timeKey: 'discover.stories.wellness.time',
  },
];
