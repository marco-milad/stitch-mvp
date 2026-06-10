// Share-pass helper — wraps `navigator.share` with a WhatsApp deep-link
// fallback so a resident can hand the visitor pass off to their guest
// regardless of browser support.
//
// Order of preference:
//   1. Web Share API (`navigator.share`) — native sheet on iOS / Android,
//      desktop Chromium picks up its OS share menu. Best UX, gives the
//      user the broadest choice of destinations.
//   2. WhatsApp web link — `https://api.whatsapp.com/send?text=...` opens
//      WhatsApp Web on desktop / the WhatsApp app on mobile (it's the
//      canonical entrypoint, no need to detect platform). Compose
//      surface is pre-filled with the same message.
//   3. Clipboard fallback — if the browser has neither, copy the
//      message and return `'copied'` so the caller can show a toast.

import type { VisitorPass } from '@/lib/residentApi';

export type ShareResult = 'native' | 'whatsapp' | 'copied' | 'cancelled' | 'unsupported';

export interface ShareCopy {
  title: string;
  message: string;
}

/** Compose the message body. Caller passes language-resolved strings
 *  so the share copy uses the resident's active locale even when the
 *  Share API itself is a native sheet outside React. */
export function composePassMessage(pass: VisitorPass, copy: ShareCopy): string {
  return copy.message;
}

interface SharePassOpts {
  pass: VisitorPass;
  /** Localized title + composed body. */
  copy: ShareCopy;
}

export async function sharePass({ pass, copy }: SharePassOpts): Promise<ShareResult> {
  const text = composePassMessage(pass, copy);

  // Native Web Share — preferred. Some browsers expose `navigator.share`
  // but only support sharing a URL (no `text`-only); we feature-detect
  // via canShare when available, otherwise pass the data through and
  // catch failures.
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const data: ShareData = { title: copy.title, text };
    const canShare = typeof navigator.canShare === 'function' ? navigator.canShare(data) : true;
    if (canShare) {
      try {
        await navigator.share(data);
        return 'native';
      } catch (err) {
        // User cancelled the share sheet — not an error. Browsers
        // reject with AbortError / NotAllowedError; treat both as
        // "the user backed out".
        if (err instanceof Error && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
          return 'cancelled';
        }
        // Anything else — fall through to WhatsApp.
      }
    }
  }

  // WhatsApp deep-link fallback. `api.whatsapp.com/send` works on both
  // mobile (opens the app) and desktop (opens WhatsApp Web). New tab
  // so the resident keeps their session.
  if (typeof window !== 'undefined') {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win) return 'whatsapp';
  }

  // Last-ditch clipboard. Returning 'copied' lets the caller show a
  // toast ("Pass copied to clipboard — paste into your messaging app").
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch {
      // Permission denied / not in secure context — fall through.
    }
  }

  return 'unsupported';
}
