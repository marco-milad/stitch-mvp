import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Gradient } from '@/components/community/Gradient';
import { UnsplashImage } from '@/components/ui/UnsplashImage';
import { VISUAL_PALETTE } from '@/lib/mock/feedStories';

import type { ResolvedStory } from './types';

const DEFAULT_DURATION_MS = 4000;

interface Props {
  stories: ReadonlyArray<ResolvedStory>;
  startId: string | undefined;
  onClose: () => void;
  onMarkViewed: (id: string) => void;
  /** Per-story autoplay duration. Defaults to 4s. */
  durationMs?: number;
}

/**
 * Fullscreen IG-style story viewer. Top progress bars, autoplay,
 * tap-left/tap-right zones, ESC closes. Data is i18n-resolved by the caller.
 * Tap zones are physical halves (don't flip in RTL) — IG convention.
 */
export function StoryViewer({
  stories,
  startId,
  onClose,
  onMarkViewed,
  durationMs = DEFAULT_DURATION_MS,
}: Props) {
  const startIdx = useMemo(() => {
    const i = stories.findIndex((s) => s.id === startId);
    return i === -1 ? 0 : i;
  }, [stories, startId]);
  const [idx, setIdx] = useState(startIdx);

  const story = stories[idx];
  const palette = story ? VISUAL_PALETTE[story.visual] : null;

  const advance = (delta: number) => {
    const next = idx + delta;
    if (next < 0 || next >= stories.length) {
      onClose();
      return;
    }
    setIdx(next);
  };

  // Autoplay
  useEffect(() => {
    if (!story) return;
    onMarkViewed(story.id);
    const timer = setTimeout(() => advance(1), durationMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, story]);

  // ESC closes — standard expectation for fullscreen overlays.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!story || !palette) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black text-white min-h-screen">
        <p>Story not found</p>
      </div>
    );
  }

  return (
    <Gradient from={palette.from} to={palette.to} style={{ flex: 1, minHeight: '100vh' }}>
      {/* Photo layer — sits between the brand-gradient backdrop and the viewer chrome.
          Absent for community stories (emoji-on-gradient classic look preserved). */}
      {story.imageUrl && (
        <UnsplashImage
          src={story.imageUrl}
          alt={story.title}
          fill
          loading="eager"
          overlayClassName="bg-gradient-to-t from-black/70 via-black/30 to-black/40"
        />
      )}

      <div className="relative flex flex-col h-full min-h-screen">
        {/* Progress bars */}
        <div className="flex flex-row px-3 pt-3 gap-1">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden bg-white/35">
              {i < idx && <div className="h-full w-full bg-white" />}
              {i === idx && (
                <div
                  className="h-full bg-white"
                  style={{ animation: `storyProgress ${durationMs}ms linear forwards` }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex flex-row items-center justify-between px-4 mt-3">
          <span className="text-white font-semibold">{story.label}</span>
          <button type="button" onClick={onClose} aria-label="Close story" className="p-2">
            <X color="#fff" size={24} />
          </button>
        </div>

        {/* Content — with a photo, push to the bottom so the imagery breathes;
             without one, center-stack the classic emoji-on-gradient layout. */}
        <div
          className={[
            'flex-1 flex flex-col px-6',
            story.imageUrl ? 'justify-end pb-12' : 'items-center justify-center',
          ].join(' ')}
        >
          {story.imageUrl ? (
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/15 backdrop-blur mb-3 text-2xl">
              {story.emoji}
            </span>
          ) : (
            <span className="text-9xl mb-6">{story.emoji}</span>
          )}
          <h2
            className={[
              'text-white text-3xl font-extrabold mb-2',
              story.imageUrl ? '' : 'text-center',
            ].join(' ')}
          >
            {story.title}
          </h2>
          <p
            className={[
              'text-white/90 text-base',
              story.imageUrl ? '' : 'text-center text-white/85',
            ].join(' ')}
          >
            {story.sub}
          </p>
          <p className={['text-white/60 text-xs', story.imageUrl ? 'mt-3' : 'mt-6'].join(' ')}>
            {story.time}
          </p>
        </div>

        {/* Tap zones — physical halves (don't flip in RTL, IG convention) */}
        <div className="absolute inset-0 flex flex-row">
          <button
            type="button"
            className="flex-1 bg-transparent"
            onClick={() => advance(-1)}
            aria-label="Previous story"
          />
          <button
            type="button"
            className="flex-1 bg-transparent"
            onClick={() => advance(1)}
            aria-label="Next story"
          />
        </div>
      </div>

      <style>{`
        @keyframes storyProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </Gradient>
  );
}
