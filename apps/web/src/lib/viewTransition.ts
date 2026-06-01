// Tiny wrapper around the View Transitions API for React Router
// navigations. Chromium + Safari support `document.startViewTransition`
// natively; Firefox falls back to instant navigation. The fallback
// path keeps the call site identical, no feature detection bleed.
//
// Usage:
//   const navWith = useNavigateWithTransition();
//   navWith('/services/requests');
//
// Add `view-transition-name: <unique>` to a shared element (e.g. a
// status badge) on both screens to get a shared-element morph.

import { useCallback } from 'react';
import { useNavigate, type NavigateOptions } from 'react-router-dom';

// View Transitions API is available in Chromium 111+ and Safari 18.
// `startViewTransition` is present in modern lib.dom.d.ts but optional in
// older versions — feature-detect at runtime via a minimal shape rather
// than extending Document directly (which clashes with TS lib types).
type MaybeVT = {
  startViewTransition?: (cb: () => void) => unknown;
};

export function useNavigateWithTransition() {
  const navigate = useNavigate();
  return useCallback(
    (to: string, options?: NavigateOptions) => {
      const doc = document as unknown as MaybeVT;
      if (typeof doc.startViewTransition === 'function') {
        doc.startViewTransition(() => navigate(to, options));
      } else {
        navigate(to, options);
      }
    },
    [navigate],
  );
}
