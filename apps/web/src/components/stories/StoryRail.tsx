import { resolveIcon } from '@/components/ui/ContextIcon';
import { VISUAL_PALETTE } from '@/lib/mock/feedStories';

import type { ResolvedStory } from './types';

interface Props {
  stories: ReadonlyArray<ResolvedStory>;
  viewedIds: ReadonlySet<string>;
  onSelect: (id: string) => void;
}

/**
 * Horizontal ring rail (IG-style). Unviewed rings show the gradient + amber
 * border; viewed rings desaturate. Data is pre-translated by the caller —
 * this component is i18n-free.
 */
export function StoryRail({ stories, viewedIds, onSelect }: Props) {
  return (
    <div className="flex flex-row overflow-x-auto no-scrollbar px-3 py-2 gap-1.5">
      {stories.map((story) => {
        const viewed = viewedIds.has(story.id);
        return (
          <button
            type="button"
            key={story.id}
            onClick={() => onSelect(story.id)}
            aria-label={`Story: ${story.label}`}
            className="flex-shrink-0 flex flex-col items-center"
            style={{ width: 76 }}
          >
            <Ring story={story} viewed={viewed} />
            <span className="text-[10px] mt-1.5 text-ink-700 dark:text-white truncate w-full text-center">
              {story.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Ring({ story, viewed }: { story: ResolvedStory; viewed: boolean }) {
  const palette = VISUAL_PALETTE[story.visual];
  const Icon = resolveIcon(story.emoji);
  if (viewed) {
    return (
      <div className="w-[68px] h-[68px] rounded-full bg-ink-100 dark:bg-ink-700 flex items-center justify-center">
        <div className="w-[60px] h-[60px] rounded-full bg-white dark:bg-ink-900 flex items-center justify-center">
          <div
            className="w-[54px] h-[54px] rounded-full flex items-center justify-center opacity-60"
            style={{ background: palette.from }}
          >
            <Icon size={24} className="text-white" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      className="w-[68px] h-[68px] rounded-full flex items-center justify-center"
      style={{ background: 'linear-gradient(45deg, #F59E0B, #EC4899)' }}
    >
      <div className="w-[60px] h-[60px] rounded-full bg-white dark:bg-ink-900 flex items-center justify-center">
        <div
          className="w-[54px] h-[54px] rounded-full flex items-center justify-center shadow-lg"
          style={{ background: `linear-gradient(135deg, ${palette.from}, ${palette.to})` }}
        >
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
}
