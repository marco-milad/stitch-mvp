// Comment thread state for the admin-published feed. Comments are the
// resident interactivity channel — residents read official posts and
// react via comments + likes (they can't compose posts after the
// 2026-05-18 architecture pivot).

export interface Comment {
  id: string;
  postId: string;
  /** Either a neighbor id (mock comments) or the literal "me" for the
   *  current user's freshly-typed comments. */
  authorId: string;
  /** Denormalized so renders don't need to cross-reference the Neighbors
   *  store — keeps the comment cards self-contained. */
  authorName: string;
  authorInitials: string;
  /** Hex color from AVATAR_PALETTE, picked deterministically from authorId. */
  authorColor: string;
  text: string;
  /** ISO timestamp; UI renders relative ("3h", "Yesterday", etc.). */
  createdAt: string;
  likes: number;
  /** Whether the current user has liked this comment. */
  isLiked: boolean;
}

/** Render-friendly relative time. Pure function so it's easy to test.
 *  Returns an i18n key + interpolation value the screen can render. */
export function relativeTime(
  iso: string,
  nowMs: number = Date.now(),
): { key: string; value?: number } {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return { key: 'comments.relative.justNow' };
  const diffSec = Math.floor((nowMs - ts) / 1000);
  if (diffSec < 45) return { key: 'comments.relative.justNow' };
  const min = Math.floor(diffSec / 60);
  if (min < 60) return { key: 'comments.relative.mAgo', value: min };
  const hr = Math.floor(min / 60);
  if (hr < 24) return { key: 'comments.relative.hAgo', value: hr };
  const day = Math.floor(hr / 24);
  if (day < 7) return { key: 'comments.relative.dAgo', value: day };
  const wk = Math.floor(day / 7);
  return { key: 'comments.relative.wAgo', value: wk };
}
