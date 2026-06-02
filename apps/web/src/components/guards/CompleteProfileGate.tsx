// Route guard: residents who are signed in but haven't finalised the
// mandatory profile fields get redirected to /complete-profile.
//
// Composition rules:
//   - The /complete-profile route itself MUST NOT use this gate
//     (infinite redirect).
//   - The /sign-in, /sign-up, /onboarding routes are intentionally
//     ungated so first-time users can reach the auth surfaces before
//     being asked to complete a profile.
//   - All in-app surfaces (tabs, modals, full-screen actions) sit
//     inside this gate so the form is unskippable once the user is
//     authenticated.
//
// Anonymous / signed-out users pass through untouched — the gate only
// activates when Clerk says we have an authenticated session.

import { useAuth } from '@clerk/clerk-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useIsProfileComplete } from '@/stores/completeProfileStore';

/** Routes that are allowed to render even when the profile is
 *  incomplete. Anything not in this list gets redirected. Wildcards
 *  match by prefix. */
const ALLOW_INCOMPLETE: ReadonlyArray<string> = [
  '/complete-profile',
  '/sign-in',
  '/sign-up',
  '/onboarding',
];

function isAllowedWhenIncomplete(pathname: string): boolean {
  return ALLOW_INCOMPLETE.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function CompleteProfileGate() {
  const { isSignedIn, isLoaded } = useAuth();
  const isProfileComplete = useIsProfileComplete();
  const { pathname } = useLocation();

  // Wait for Clerk's session check before deciding — otherwise we'd
  // flicker-redirect on first paint while the SDK boots.
  if (!isLoaded) return <Outlet />;

  // Anonymous users pass through. They'll hit Clerk's own auth flow
  // when they try to reach a protected surface.
  if (!isSignedIn) return <Outlet />;

  // Authenticated + complete = full app access.
  if (isProfileComplete) return <Outlet />;

  // Authenticated + incomplete = redirect, except on the small set of
  // allow-listed auth/onboarding paths.
  if (isAllowedWhenIncomplete(pathname)) return <Outlet />;

  return <Navigate to="/complete-profile" replace />;
}
