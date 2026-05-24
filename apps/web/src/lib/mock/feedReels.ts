// Mock community reels — short-form video cards in the feed.
// Categories aligned with the new resident-content taxonomy.
// TODO: API — replace with GET /api/v1/reels in Week 6.

import type { PostCategory } from './feedPosts';
import type { StoryVisual } from './feedStories';

export interface FeedReel {
  id: string;
  kind: 'reel';
  cat: PostCategory;
  when: string;
  title: string;
  desc: string;
  visual: StoryVisual;
}

export const FEED_REELS: FeedReel[] = [
  {
    id: 'r1',
    kind: 'reel',
    cat: 'events',
    when: '3h ago',
    title: 'Pool Party Recap 🎉',
    desc: 'لحظات من حفلة المسبح اللي فاتت — ٤٠٠+ ساكن حضر، DJ نار، وذكريات لا تُنسى.',
    visual: 'water',
  },
  {
    id: 'r2',
    kind: 'reel',
    cat: 'sports',
    when: '1d ago',
    title: 'Padel Tournament Highlights 🎾',
    desc: 'أحلى لقطات من بطولة الـ padel — ١٦ فريق، ٤ ساعات، وفائز واحد. شوفوا الـ final point.',
    visual: 'zen',
  },
  {
    id: 'r3',
    kind: 'reel',
    cat: 'announcements',
    when: '2d ago',
    title: 'Gym Equipment Tour 💪',
    desc: 'جولة سريعة في الـ Wellness Lab — ٢٠ ماكينة كارديو + crossfit zone كاملة.',
    visual: 'fire',
  },
  {
    id: 'r4',
    kind: 'reel',
    cat: 'general',
    when: '4d ago',
    title: 'Community Garden Day 🌱',
    desc: 'يوم زراعة جماعي — ٥٠ عائلة شاركت في زراعة الحديقة المجتمعية الجديدة.',
    visual: 'leaves',
  },
  {
    id: 'r5',
    kind: 'reel',
    cat: 'events',
    when: '5d ago',
    title: 'Eid Celebration ✨',
    desc: 'احتفالنا بالعيد — كحك، عيدية للأطفال، ولمسات خاصة لكل ساكن.',
    visual: 'sparkle',
  },
];
