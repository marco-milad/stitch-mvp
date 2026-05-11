import * as SecureStore from 'expo-secure-store';

/**
 * Clerk's `tokenCache` interface backed by Expo SecureStore. Stores the JWT
 * encrypted on-device (Keychain on iOS, Keystore on Android).
 */
export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // SecureStore is best-effort; swallow failures (e.g. simulator quirks)
    }
  },
};
