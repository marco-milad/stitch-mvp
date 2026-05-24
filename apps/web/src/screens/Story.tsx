import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { StoryViewer } from '@/components/stories/StoryViewer';
import type { ResolvedStory } from '@/components/stories/types';
import { FEED_STORIES } from '@/lib/mock/feedStories';
import { useFeedStore } from '@/stores/feedStore';

export function Story() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const markStoryViewed = useFeedStore((s) => s.markStoryViewed);

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
    <StoryViewer
      stories={resolved}
      startId={id}
      onClose={() => navigate(-1)}
      onMarkViewed={markStoryViewed}
    />
  );
}
