import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { StoryRail } from '@/components/stories/StoryRail';
import type { ResolvedStory } from '@/components/stories/types';
import { FEED_STORIES } from '@/lib/mock/feedStories';
import { useFeedStore } from '@/stores/feedStore';

export function StoryBar() {
  const navigate = useNavigate();
  const viewedStories = useFeedStore((s) => s.viewedStories);

  // FEED_STORIES already holds literal strings — pass through verbatim.
  const resolved = useMemo<ResolvedStory[]>(
    () =>
      FEED_STORIES.map((s) => ({
        id: s.id,
        emoji: s.emoji,
        visual: s.visual,
        label: s.label,
        title: s.title,
        sub: s.sub,
        time: s.time,
      })),
    [],
  );

  return (
    <StoryRail
      stories={resolved}
      viewedIds={viewedStories}
      onSelect={(id) => navigate(`/story/${id}`)}
    />
  );
}
