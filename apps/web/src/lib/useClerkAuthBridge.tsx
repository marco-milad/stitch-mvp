// Bridges Clerk's `useAuth().getToken` into the residentApi module-level
// token provider. Mounted once at the app root so every `/me/*` HTTP
// request and every WebSocket open carries a fresh Clerk JWT.
//
// Why a module-level provider instead of threading the token through
// every API call: the WS opener lives outside the React tree (it's
// invoked by `useNotificationsSync` + MyMaintenanceTickets effects)
// and would need its own prop-drill otherwise. The bridge unifies the
// HTTP and WS auth path through one registration point.

import { useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';

import { registerAuthTokenProvider } from '@/lib/residentApi';

/** Mount inside ClerkProvider, ideally near the app root. Renders
 *  nothing — pure side-effect hook component. */
export function ClerkAuthBridge(): null {
  const { isLoaded, getToken } = useAuth();

  useEffect(() => {
    // Don't register until Clerk has actually loaded — calling getToken
    // before isLoaded sometimes resolves to null even for signed-in
    // users (Clerk SDK race), which would leak 401s on first paint.
    if (!isLoaded) return;

    registerAuthTokenProvider(async () => {
      try {
        // Two-pass token fetch:
        //   1. Cached fast path — Clerk normally returns the cached JWT
        //      and only re-fetches when it's within 30s of expiry, so
        //      this is the common-case cheap call.
        //   2. Forced refresh — if the cache returned null OR a token
        //      that's about to expire, retry with skipCache so the SDK
        //      hits Clerk's session endpoint and pulls a fresh one. This
        //      closes a race where the cached token expires between
        //      getToken() resolving and the fetch() actually firing, and
        //      eliminates the "Missing Authorization header" 401 path on
        //      the FastAPI side.
        // Default session token is what the backend's PyJWKClient
        // verifies against; no template arg.
        let token = await getToken();
        if (!token) {
          token = await getToken({ skipCache: true });
        }
        if (!token) {
          // Genuine session loss — not a cache hiccup. Surface clearly
          // so the http() helper can short-circuit instead of firing an
          // unauthenticated request that the backend will 401.
          console.warn(
            '[ClerkAuthBridge] getToken returned null even after skipCache — Clerk session is gone. User needs to sign in again.',
          );
        }
        return token;
      } catch (err) {
        console.warn('[ClerkAuthBridge] getToken threw:', err);
        return null;
      }
    });

    return () => {
      registerAuthTokenProvider(null);
    };
  }, [isLoaded, getToken]);

  return null;
}
