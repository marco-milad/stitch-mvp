import { Bookmark, BookmarkCheck, CheckCircle2, Heart, MessageSquare, Share2 } from 'lucide-react';
import { memo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { UnsplashImage } from '@/components/ui/UnsplashImage';
import { formatNumber } from '@/lib/format';
import type { FeedPost } from '@/lib/mock/feedPosts';
import { colors } from '@/lib/theme';
import { useCommentCount } from '@/stores/commentsStore';
import { useFeedStore } from '@/stores/feedStore';

const SLIDE_H = 220;

function PostCardImpl({ post }: { post: FeedPost }) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [slideIdx, setSlideIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const bookmarked = useFeedStore((s) => s.bookmarks.has(post.id));
  const rsvped = useFeedStore((s) => s.rsvps.has(post.id));
  const liked = useFeedStore((s) => s.likes.has(post.id));
  const toggleBookmark = useFeedStore((s) => s.toggleBookmark);
  const toggleRsvp = useFeedStore((s) => s.toggleRsvp);
  const toggleLike = useFeedStore((s) => s.toggleLike);
  const liveCommentCount = useCommentCount(post.id);
  const displayedComments = post.comments + liveCommentCount;

  const openDetail = () => navigate(`/community/posts/${post.id}`);
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const onSlideScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setSlideIdx(Math.round(el.scrollLeft / el.clientWidth));
  };

  const cardBorder = post.pinned
    ? 'border-2 border-amber-400'
    : 'border border-ink-100 dark:border-ink-700';

  const displayedLikes = post.likes + (liked ? 1 : 0);
  const lang = i18n.language;

  return (
    <div
      onClick={openDetail}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDetail();
        }
      }}
      className={`mx-4 mb-4 bg-white dark:bg-ink-700 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.997] transition-transform ${cardBorder}`}
    >
      {post.pinned && (
        <div className="px-4 py-1.5 bg-amber-400 flex flex-row items-center">
          <span className="text-[10px] font-bold text-ink-900 tracking-wide">
            📌 PINNED BY MANAGEMENT
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-row items-center px-4 py-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center me-3 flex-shrink-0 text-white text-xs font-bold"
          style={{
            background: `linear-gradient(135deg, ${post.author.avatarFrom}, ${post.author.avatarTo})`,
          }}
        >
          {post.author.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-row items-center gap-1">
            <span className="text-sm font-semibold text-ink-900 dark:text-white truncate">
              {post.author.name}
            </span>
            {post.author.verified && (
              <CheckCircle2 color="#06B6D4" size={14} fill="#06B6D4" className="flex-shrink-0" />
            )}
            {post.author.role === 'management' && (
              <span className="ms-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 flex-shrink-0">
                Official
              </span>
            )}
          </div>
          <span className="text-[11px] text-ink-500 dark:text-ink-100">{post.when}</span>
        </div>
      </div>

      {/* Slide carousel */}
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={onSlideScroll}
          className="flex flex-row overflow-x-auto snap-x snap-mandatory no-scrollbar"
          style={{ height: SLIDE_H }}
        >
          {post.slides.map((slide, i) => (
            <div
              key={i}
              className="relative flex-shrink-0 w-full snap-center flex flex-col items-center justify-center p-4 overflow-hidden"
              style={{ height: SLIDE_H, backgroundColor: slide.bg }}
            >
              {slide.imageUrl && (
                <UnsplashImage
                  src={slide.imageUrl}
                  alt={slide.title}
                  fill
                  loading="lazy"
                  overlayClassName="bg-gradient-to-t from-black/70 via-black/30 to-black/40"
                />
              )}
              <span className="relative text-6xl mb-2">{slide.emoji}</span>
              <span className="relative text-white text-xl font-bold mb-1 text-center">
                {slide.title}
              </span>
              <span className="relative text-white/80 text-xs text-center">{slide.sub}</span>
            </div>
          ))}
        </div>

        {post.slides.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex flex-row justify-center pointer-events-none">
            {post.slides.map((_, i) => (
              <span
                key={i}
                className="mx-0.5 rounded-full transition-all"
                style={{
                  width: i === slideIdx ? 18 : 6,
                  height: 6,
                  backgroundColor: i === slideIdx ? '#fff' : 'rgba(255,255,255,0.5)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions row */}
      <div className="flex flex-row items-center gap-3 px-4 py-2.5" onClick={stop}>
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            toggleLike(post.id);
          }}
          aria-label={liked ? 'Unlike' : 'Like'}
          aria-pressed={liked ? 'true' : 'false'}
          className="inline-flex items-center gap-1"
        >
          {liked ? (
            <Heart color="#EC4899" size={22} fill="#EC4899" />
          ) : (
            <Heart color={colors.ink[500]} size={22} />
          )}
          <span className="text-[11px] font-semibold text-ink-700 dark:text-ink-100 tabular-nums">
            {formatNumber(displayedLikes, lang)}
          </span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            openDetail();
          }}
          aria-label="Comments"
          className="inline-flex items-center gap-1"
        >
          <MessageSquare color={colors.ink[500]} size={22} />
          <span className="text-[11px] font-semibold text-ink-700 dark:text-ink-100 tabular-nums">
            {formatNumber(displayedComments, lang)}
          </span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            toggleBookmark(post.id);
          }}
          aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          {bookmarked ? (
            <BookmarkCheck color="#06B6D4" size={22} fill="#06B6D4" />
          ) : (
            <Bookmark color={colors.ink[500]} size={22} />
          )}
        </button>
        <button type="button" onClick={stop} aria-label="Share">
          <Share2 color={colors.ink[500]} size={22} />
        </button>

        {post.isEvent && (
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              toggleRsvp(post.id);
            }}
            aria-label={rsvped ? 'Cancel RSVP' : 'RSVP'}
            className={`ms-auto px-4 py-1.5 rounded-full ${
              rsvped ? 'bg-emerald-500' : 'bg-brand-500'
            }`}
          >
            <span className="text-white text-xs font-bold">
              {rsvped ? "You're going ✓" : 'RSVP'}
            </span>
          </button>
        )}
      </div>

      {/* Caption */}
      <div className="px-4 pb-4">
        <p className="text-sm text-ink-700 dark:text-white leading-5 line-clamp-4">
          {post.caption}
        </p>
      </div>
    </div>
  );
}

export const PostCard = memo(PostCardImpl);
