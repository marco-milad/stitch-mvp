// Post / Reel detail screen — the "open the conversation" view residents
// land on when they tap a feed card. Shows full content + comment thread +
// sticky bottom input bar. Comments are the only resident interactivity
// channel after the 2026-05-18 admin-only feed pivot.

import { useUser } from '@clerk/clerk-react';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Heart,
  MoreHorizontal,
  Search,
  Send,
  Share2,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { ReelCanvasBg } from '@/components/community/ReelCanvasBg';
import { resolveIcon } from '@/components/ui/ContextIcon';
import { UnsplashImage } from '@/components/ui/UnsplashImage';
import { formatNumber } from '@/lib/format';
import { FEED_POSTS } from '@/lib/mock/feedPosts';
import { FEED_REELS } from '@/lib/mock/feedReels';
import { relativeTime } from '@/lib/schemas/comment';
import { colors } from '@/lib/theme';
import { useCommentsForPost, useCommentsStore } from '@/stores/commentsStore';
import { useFeedStore } from '@/stores/feedStore';

const SLIDE_H = 260;
const REEL_H = 320;

export function PostDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useUser();

  const post = useMemo(() => FEED_POSTS.find((p) => p.id === id), [id]);
  const reel = useMemo(() => FEED_REELS.find((r) => r.id === id), [id]);

  const liked = useFeedStore((s) => s.likes.has(id));
  const bookmarked = useFeedStore((s) => s.bookmarks.has(id));
  const rsvped = useFeedStore((s) => s.rsvps.has(id));
  const toggleLike = useFeedStore((s) => s.toggleLike);
  const toggleBookmark = useFeedStore((s) => s.toggleBookmark);
  const toggleRsvp = useFeedStore((s) => s.toggleRsvp);

  const comments = useCommentsForPost(id);
  const addComment = useCommentsStore((s) => s.addComment);
  const toggleCommentLike = useCommentsStore((s) => s.toggleLike);

  const [draft, setDraft] = useState('');
  const [slideIdx, setSlideIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!post && !reel) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-20 text-center">
        <div className="relative mb-4">
          <span aria-hidden className="absolute inset-0 rounded-full bg-brand-300/40 blur-2xl" />
          <div className="relative w-14 h-14 rounded-2xl bg-white/65 dark:bg-ink-700/65 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-lg flex items-center justify-center">
            <Search size={24} className="text-brand-500" />
          </div>
        </div>
        <p className="text-sm text-ink-500 mb-4">{t('post.detail.notFound')}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-full bg-brand-500 text-white text-xs font-semibold"
        >
          {t('post.detail.back')}
        </button>
      </div>
    );
  }

  const lang = i18n.language;
  const displayedLikes = post ? post.likes + (liked ? 1 : 0) : 0;

  const onSubmit = () => {
    const text = draft.trim();
    if (!text) return;
    const fallback = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
    const name = user?.fullName ?? (fallback || 'You');
    addComment(id, text, { name, id: user?.id });
    setDraft('');
  };

  const onSlideScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setSlideIdx(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-ink-900">
      {/* Header */}
      <div className="sticky top-0 z-10 flex flex-row items-center gap-2 bg-white/95 dark:bg-ink-900/95 backdrop-blur border-b border-ink-100 dark:border-ink-700 px-3 py-2.5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label={t('post.detail.back')}
          className="p-1.5 rounded-full hover:bg-ink-100 dark:hover:bg-ink-700"
        >
          <ArrowLeft size={20} className="text-ink-700 dark:text-white rtl:rotate-180" />
        </button>
        <span className="flex-1 text-sm font-semibold text-ink-900 dark:text-white truncate">
          {post?.author.name ?? t('community.title')}
        </span>
        <button
          type="button"
          aria-label={t('post.detail.share')}
          className="p-1.5 rounded-full hover:bg-ink-100 dark:hover:bg-ink-700"
        >
          <Share2 size={18} className="text-ink-700 dark:text-white" />
        </button>
        <button
          type="button"
          aria-label={t('post.detail.more')}
          className="p-1.5 rounded-full hover:bg-ink-100 dark:hover:bg-ink-700"
        >
          <MoreHorizontal size={18} className="text-ink-700 dark:text-white" />
        </button>
      </div>

      {/* Scrollable content + thread */}
      <div className="flex-1 overflow-y-auto pb-32">
        {/* ── Post hero ───────────────────────────────────────────── */}
        {post && (
          <>
            <div className="flex flex-row items-center px-4 py-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center me-3 flex-shrink-0 text-white text-sm font-bold"
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
                    <CheckCircle2 color="#06B6D4" size={14} fill="#06B6D4" />
                  )}
                  <span className="ms-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300">
                    {t('feed.official')}
                  </span>
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
                {post.slides.map((slide, i) => {
                  const SlideIcon = resolveIcon(slide.emoji);
                  return (
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
                      <span className="relative mb-3 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/30 shadow-lg">
                        <SlideIcon size={32} className="text-white" />
                      </span>
                      <span className="relative text-white text-2xl font-bold mb-1 text-center">
                        {slide.title}
                      </span>
                      <span className="relative text-white/80 text-xs text-center">
                        {slide.sub}
                      </span>
                    </div>
                  );
                })}
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
            <div className="flex flex-row items-center gap-4 px-4 py-3">
              <button
                type="button"
                onClick={() => toggleLike(id)}
                aria-pressed={liked ? 'true' : 'false'}
                className="inline-flex items-center gap-1.5"
              >
                {liked ? (
                  <Heart color="#EC4899" size={24} fill="#EC4899" />
                ) : (
                  <Heart color={colors.ink[500]} size={24} />
                )}
                <span className="text-xs font-semibold text-ink-700 dark:text-ink-100 tabular-nums">
                  {formatNumber(displayedLikes, lang)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => toggleBookmark(id)}
                aria-pressed={bookmarked ? 'true' : 'false'}
              >
                {bookmarked ? (
                  <BookmarkCheck color="#06B6D4" size={24} fill="#06B6D4" />
                ) : (
                  <Bookmark color={colors.ink[500]} size={24} />
                )}
              </button>

              {post.isEvent && (
                <button
                  type="button"
                  onClick={() => toggleRsvp(id)}
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

            {/* Caption (full, not clamped) */}
            <div className="px-4 pb-4">
              <p className="text-sm text-ink-700 dark:text-white leading-6 whitespace-pre-wrap">
                {post.caption}
              </p>
            </div>
          </>
        )}

        {/* ── Reel hero ───────────────────────────────────────────── */}
        {reel && (
          <>
            <div
              className="relative overflow-hidden mx-4 my-3 rounded-2xl"
              style={{ height: REEL_H }}
            >
              <ReelCanvasBg visual={reel.visual} height={REEL_H} />
              <div className="absolute top-3 right-3 bg-black/30 px-2 py-1 rounded-md">
                <span className="text-white text-[10px] font-bold tracking-wider">REEL</span>
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 flex flex-col justify-end p-4"
                style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
              >
                <span className="text-white text-lg font-bold mb-1">{reel.title}</span>
                <span className="text-white/80 text-xs leading-5">{reel.desc}</span>
                <span className="text-white/60 text-[10px] mt-1">{reel.when}</span>
              </div>
            </div>
            <div className="flex flex-row items-center gap-4 px-4 pb-2">
              <button
                type="button"
                onClick={() => toggleLike(id)}
                aria-pressed={liked ? 'true' : 'false'}
                className="inline-flex items-center gap-1.5"
              >
                {liked ? (
                  <Heart color="#EC4899" size={24} fill="#EC4899" />
                ) : (
                  <Heart color={colors.ink[500]} size={24} />
                )}
              </button>
              <button
                type="button"
                onClick={() => toggleBookmark(id)}
                aria-pressed={bookmarked ? 'true' : 'false'}
              >
                {bookmarked ? (
                  <BookmarkCheck color="#06B6D4" size={24} fill="#06B6D4" />
                ) : (
                  <Bookmark color={colors.ink[500]} size={24} />
                )}
              </button>
            </div>
          </>
        )}

        {/* ── Comment thread ──────────────────────────────────────── */}
        <div className="px-4 pt-2 pb-4 border-t border-ink-100 dark:border-ink-700 mt-2">
          <div className="flex flex-row items-baseline gap-2 mb-3">
            <h2 className="text-sm font-bold text-ink-900 dark:text-white">
              {t('comments.title')}
            </h2>
            <span className="text-[11px] text-ink-500 dark:text-ink-100">
              {t('comments.count', { count: comments.length, n: comments.length })}
            </span>
          </div>

          {comments.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-ink-100 py-6 text-center">
              {t('comments.empty')}
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {comments.map((c) => {
                const rel = relativeTime(c.createdAt);
                return (
                  <li key={c.id} className="flex flex-row gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                      style={{ backgroundColor: c.authorColor }}
                    >
                      {c.authorInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-row items-baseline gap-2">
                        <span className="text-xs font-semibold text-ink-900 dark:text-white truncate">
                          {c.authorName}
                        </span>
                        <span className="text-[10px] text-ink-500 dark:text-ink-100">
                          {t(rel.key, rel.value !== undefined ? { value: rel.value } : undefined)}
                        </span>
                      </div>
                      <p className="text-sm text-ink-700 dark:text-white leading-5 mt-0.5 whitespace-pre-wrap break-words">
                        {c.text}
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleCommentLike(id, c.id)}
                        aria-pressed={c.isLiked ? 'true' : 'false'}
                        className="inline-flex items-center gap-1 mt-1.5"
                      >
                        {c.isLiked ? (
                          <Heart color="#EC4899" size={14} fill="#EC4899" />
                        ) : (
                          <Heart color={colors.ink[500]} size={14} />
                        )}
                        {c.likes > 0 && (
                          <span className="text-[11px] font-semibold text-ink-500 dark:text-ink-100 tabular-nums">
                            {formatNumber(c.likes, lang)}
                          </span>
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Sticky input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-ink-900/95 backdrop-blur border-t border-ink-100 dark:border-ink-700 px-3 py-2.5 flex flex-row items-center gap-2"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('comments.placeholder')}
          className="flex-1 rounded-full bg-ink-100 dark:bg-ink-700 px-4 py-2 text-sm text-ink-900 dark:text-white placeholder:text-ink-500 outline-none focus:ring-2 focus:ring-brand-500"
          aria-label={t('comments.placeholder')}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label={t('comments.send')}
          className="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={16} className="rtl:rotate-180" />
        </button>
      </form>
    </div>
  );
}
