import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { StoryViewer } from '@/components/stories/StoryViewer';
import type { ResolvedStory } from '@/components/stories/types';
import { DISCOVER_STORIES } from '@/lib/mock/discoverStories';
import { useDiscoverStore } from '@/stores/discoverStore';

export function DiscoverStory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const markStoryViewed = useDiscoverStore((s) => s.markStoryViewed);

  const resolved = useMemo<ResolvedStory[]>(
    () =>
      DISCOVER_STORIES.map((s) => ({
        id: s.id,
        emoji: s.emoji,
        visual: s.visual,
        imageUrl: s.imageUrl,
        label: t(s.labelKey),
        title: t(s.titleKey),
        sub: t(s.subKey),
        time: t(s.timeKey),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, i18n.language],
  );

  return (
    <StoryViewer
      stories={resolved}
      startId={id}
      onClose={() => navigate('/discover')}
      onMarkViewed={markStoryViewed}
    />
  );
}
