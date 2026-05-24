import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { MobileShell } from '@/components/MobileShell';
import { TabsLayout } from '@/layout/TabsLayout';
import { useNotificationsSync } from '@/lib/useNotifications';
import { Community } from '@/screens/Community';
import { Discover } from '@/screens/Discover';
import { DiscoverBook } from '@/screens/DiscoverBook';
import { DiscoverCalculator } from '@/screens/DiscoverCalculator';
import { DiscoverEoi } from '@/screens/DiscoverEoi';
import { DiscoverMasterPlan } from '@/screens/DiscoverMasterPlan';
import { DiscoverStory } from '@/screens/DiscoverStory';
import { DiscoverTour } from '@/screens/DiscoverTour';
import { Home } from '@/screens/Home';
import { HomeParking } from '@/screens/HomeParking';
import { NotFound } from '@/screens/NotFound';
import { Notifications } from '@/screens/Notifications';
import { Onboarding } from '@/screens/Onboarding';
import { PostDetail } from '@/screens/PostDetail';
import { Profile } from '@/screens/Profile';
import { Qr } from '@/screens/Qr';
import { NeighborsDirectory } from '@/screens/NeighborsDirectory';
import { ParkingNewPass } from '@/screens/ParkingNewPass';
import { ProfileFamily } from '@/screens/ProfileFamily';
import { ProfileFamilyInvite } from '@/screens/ProfileFamilyInvite';
import { ServiceBook } from '@/screens/ServiceBook';
import { ServiceCategory } from '@/screens/ServiceCategory';
import { ServiceCompoundMap } from '@/screens/ServiceCompoundMap';
import { ServiceParking } from '@/screens/ServiceParking';
import { ServiceProvider } from '@/screens/ServiceProvider';
import { ServiceSmartHome } from '@/screens/ServiceSmartHome';
import { ServiceRequests } from '@/screens/ServiceRequests';
import { Services } from '@/screens/Services';
import { WellnessBook } from '@/screens/WellnessBook';
import { WellnessFacility } from '@/screens/WellnessFacility';
import { WellnessHub } from '@/screens/WellnessHub';
import { SignIn } from '@/screens/SignIn';
import { SignUp } from '@/screens/SignUp';
import { Story } from '@/screens/Story';
import { Voice } from '@/screens/Voice';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY — add it to apps/web/.env');
}

function ShellRoute() {
  // Open the notifications WS once at the app root so the bell dot stays
  // live across every tab without per-screen sockets.
  useNotificationsSync();
  return (
    <MobileShell>
      <Outlet />
    </MobileShell>
  );
}

export function App() {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<ShellRoute />}>
              {/* Tabbed routes share TabsLayout */}
              <Route element={<TabsLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/community" element={<Community />} />
                <Route path="/community/neighbors" element={<NeighborsDirectory />} />
                <Route path="/services" element={<Services />} />
                <Route path="/services/requests" element={<ServiceRequests />} />
                <Route path="/services/comp-map" element={<ServiceCompoundMap />} />
                <Route path="/services/parking" element={<ServiceParking />} />
                <Route path="/services/smart-home" element={<ServiceSmartHome />} />
                <Route path="/services/wellness" element={<WellnessHub />} />
                <Route path="/services/wellness/:facilityId" element={<WellnessFacility />} />
                <Route path="/services/:tileId" element={<ServiceCategory />} />
                <Route
                  path="/services/:tileId/providers/:providerId"
                  element={<ServiceProvider />}
                />
                <Route path="/discover" element={<Discover />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/family" element={<ProfileFamily />} />
              </Route>

              {/* Modal/full-screen routes (no tab bar) */}
              <Route path="/qr" element={<Qr />} />
              <Route path="/voice" element={<Voice />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/community/posts/:id" element={<PostDetail />} />
              <Route path="/story/:id" element={<Story />} />
              <Route path="/discover/tour" element={<DiscoverTour />} />
              <Route path="/discover/master-plan" element={<DiscoverMasterPlan />} />
              <Route path="/discover/eoi" element={<DiscoverEoi />} />
              <Route path="/discover/calculator" element={<DiscoverCalculator />} />
              <Route path="/discover/book" element={<DiscoverBook />} />
              <Route path="/discover/story/:id" element={<DiscoverStory />} />
              <Route path="/services/:tileId/book" element={<ServiceBook />} />
              <Route path="/services/wellness/:facilityId/book" element={<WellnessBook />} />
              <Route path="/services/parking/new-pass" element={<ParkingNewPass />} />
              <Route path="/home/parking" element={<HomeParking />} />
              <Route path="/profile/family/invite" element={<ProfileFamilyInvite />} />

              {/* Auth routes */}
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/sign-up" element={<SignUp />} />
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Aliases mirroring expo-router groups */}
              <Route path="/(tabs)" element={<Navigate to="/" replace />} />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
