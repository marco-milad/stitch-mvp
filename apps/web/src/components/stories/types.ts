// Shared shape for the polymorphic story rail + viewer.
// Each consumer (community feed, discover lifestyle) resolves its own i18n
// keys before handing data to the generic components — keeping the rail
// and viewer i18n-free and easy to reason about.

import type { StoryVisual } from '@/lib/mock/feedStories';

export interface ResolvedStory {
  id: string;
  emoji: string;
  visual: StoryVisual;
  /** Caption shown under the ring. */
  label: string;
  /** Big headline in the viewer. */
  title: string;
  /** Body text in the viewer. */
  sub: string;
  /** Small metadata in the viewer (e.g. "Fri 8 PM"). */
  time: string;
  /** Optional full-bleed photo for the viewer slide. Falls back to the gradient when absent. */
  imageUrl?: string;
}
