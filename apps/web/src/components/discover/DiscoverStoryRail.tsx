import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { StoryRail } from '@/components/stories/StoryRail';
import type { ResolvedStory } from '@/components/stories/types';
import { DISCOVER_STORIES } from '@/lib/mock/discoverStories';
import { useDiscoverStore } from '@/stores/discoverStore';

/**
 * Lifestyle ring rail rendered at the top of the Discover Prospect view.
 * Resolves i18n keys then hands off to the generic <StoryRail />.
 */
export function DiscoverStoryRail() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const viewedStoryIds = useDiscoverStore((s) => s.viewedStoryIds);

  // i18n.language in deps so a runtime language switch re-translates.
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
    <StoryRail
      stories={resolved}
      viewedIds={viewedStoryIds}
      onSelect={(id) => navigate(`/discover/story/${id}`)}
    />
  );
}
