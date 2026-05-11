import { createApiClient } from '@stitch/api-client';

/**
 * Builds an API client bound to the current Clerk session.
 *
 * Usage in a component:
 *   const { getToken } = useAuth();
 *   const client = useMemo(() => buildApiClient(getToken), [getToken]);
 *   const me = await endpoints.users.getMe(client);
 */
export function buildApiClient(getToken: () => Promise<string | null>) {
  const baseURL = process.env.EXPO_PUBLIC_API_URL;
  if (!baseURL) {
    throw new Error('EXPO_PUBLIC_API_URL is required');
  }
  return createApiClient({ baseURL, getToken });
}
