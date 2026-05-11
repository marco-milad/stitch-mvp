// Mock community reels. Mirrors public/index.html FEED_REELS.
// TODO: API — replace with GET /api/v1/reels in Week 2.

import type { StoryVisual } from './feedStories';
import type { PostCategory } from './feedPosts';

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
    cat: 'community',
    when: '1d ago',
    title: 'New Yoga Studio Tour 🧘',
    desc: 'جولة سريعة في استوديو اليوغا الجديد — مرايا، إضاءة طبيعية، وإطلالة على الحديقة.',
    visual: 'zen',
  },
  {
    id: 'r3',
    kind: 'reel',
    cat: 'news',
    when: '2d ago',
    title: 'Gym Equipment Highlights 💪',
    desc: 'شوفوا المعدات الجديدة في الجيم — ٢٠ ماكينة كارديو + crossfit zone كاملة.',
    visual: 'fire',
  },
  {
    id: 'r4',
    kind: 'reel',
    cat: 'community',
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
