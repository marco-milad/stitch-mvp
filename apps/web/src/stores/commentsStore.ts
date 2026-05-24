// Comments store — the resident interactivity layer for the admin-driven
// feed. Comments are persisted to localStorage so resident-typed input
// survives reloads.
//
// IMPORTANT: do NOT `.filter()` / `.map()` inside a Zustand selector — it
// returns a new reference per render and triggers an infinite re-render
// loop (see [[feedback-zustand-selectors]]). Select raw, derive in useMemo.

import { useMemo } from 'react';
import { create } from 'zustand';

import { commentsByPost } from '@/lib/mock/comments';
import { initialsOf, pickAvatarColor } from '@/lib/schemas/family';
import type { Comment } from '@/lib/schemas/comment';

const STORAGE_KEY = 'stitch.comments';

type CommentsByPost = Record<string, Comment[]>;

function loadComments(): CommentsByPost {
  if (typeof localStorage === 'undefined') return commentsByPost();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return commentsByPost();
    const parsed = JSON.parse(raw) as CommentsByPost;
    return parsed && typeof parsed === 'object' ? parsed : commentsByPost();
  } catch {
    return commentsByPost();
  }
}

function persist(comments: CommentsByPost): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  } catch {
    // quota / private mode — silent
  }
}

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface CommentsState {
  comments: CommentsByPost;
  addComment: (postId: string, text: string, user: { name: string; id?: string }) => void;
  toggleLike: (postId: string, commentId: string) => void;
}

export const useCommentsStore = create<CommentsState>((set, get) => ({
  comments: loadComments(),

  addComment: (postId, text, user) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const authorId = user.id ?? `me-${user.name.toLowerCase().replace(/\s+/g, '-')}`;
    const newComment: Comment = {
      id: genId(),
      postId,
      authorId,
      authorName: user.name,
      authorInitials: initialsOf(user.name),
      authorColor: pickAvatarColor(authorId),
      text: trimmed,
      createdAt: new Date().toISOString(),
      likes: 0,
      isLiked: false,
    };
    const next: CommentsByPost = {
      ...get().comments,
      [postId]: [newComment, ...(get().comments[postId] ?? [])],
    };
    persist(next);
    set({ comments: next });
  },

  toggleLike: (postId, commentId) => {
    const list = get().comments[postId] ?? [];
    const nextList = list.map((c) =>
      c.id === commentId ? { ...c, isLiked: !c.isLiked, likes: c.likes + (c.isLiked ? -1 : 1) } : c,
    );
    const next: CommentsByPost = { ...get().comments, [postId]: nextList };
    persist(next);
    set({ comments: next });
  },
}));

/** Comments for a given post, sorted newest-first. Stable reference unless
 *  that specific post's list mutates. */
export function useCommentsForPost(postId: string): Comment[] {
  const list = useCommentsStore((s) => s.comments[postId]);
  return useMemo(() => {
    if (!list || list.length === 0) return [];
    return [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [list]);
}

/** Count helper — used by feed cards to keep their counter live. */
export function useCommentCount(postId: string): number {
  return useCommentsStore((s) => s.comments[postId]?.length ?? 0);
}
