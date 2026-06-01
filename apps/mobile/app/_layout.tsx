import '../global.css';
import '@/lib/i18n';

import { ClerkLoaded, ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { tokenCache } from '@/lib/clerk-token-cache';
import { colors } from '@/lib/theme';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY — add it to apps/mobile/.env');
}

/**
 * Auth gate: every route outside `(auth)` requires a signed-in Clerk session.
 * Drives navigation via effect rather than rendering — keeps the Stack mounted
 * so back-stack behaviour stays correct after redirects.
 */
function RouteGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (!isLoaded) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (isSignedIn && inAuthGroup) {
      router.replace('/');
    }
  }, [isLoaded, isSignedIn, segments]);

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-50 dark:bg-ink-900">
        <ActivityIndicator color={colors.brand[500]} />
      </View>
    );
  }
  return <>{children}</>;
}

export default function RootLayout() {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
              <StatusBar style="auto" />
              <RouteGuard>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="qr" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="requests" />
                  <Stack.Screen name="voice" />
                  <Stack.Screen
                    name="story/[id]"
                    options={{ presentation: 'fullScreenModal', animation: 'fade' }}
                  />
                </Stack>
              </RouteGuard>
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
