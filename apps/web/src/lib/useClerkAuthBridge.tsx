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
        // Clerk's getToken caches the JWT and only fetches when it's
        // within 30s of expiry, so calling it on every request is
        // cheap. Pass no template arg = the default session token,
        // which is what the FastAPI backend's PyJWKClient verifies
        // against.
        return await getToken();
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
