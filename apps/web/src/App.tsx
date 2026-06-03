import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { MobileShell } from '@/components/MobileShell';
import { CompleteProfileGate } from '@/components/guards/CompleteProfileGate';
import { RequireTenant } from '@/components/guards/RequireRole';
import { TabsLayout } from '@/layout/TabsLayout';
import { ClerkAuthBridge } from '@/lib/useClerkAuthBridge';
import { useNotificationsSync } from '@/lib/useNotifications';
import { AmenitiesBook } from '@/screens/AmenitiesBook';
import { Community } from '@/screens/Community';
import { CompleteProfile } from '@/screens/CompleteProfile';
import { Payments } from '@/screens/Payments';
import { Discover } from '@/screens/Discover';
import { DiscoverBook } from '@/screens/DiscoverBook';
import { DiscoverCalculator } from '@/screens/DiscoverCalculator';
import { DiscoverEoi } from '@/screens/DiscoverEoi';
import { DiscoverEoiHub } from '@/screens/DiscoverEoiHub';
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
import { ServiceHotline } from '@/screens/ServiceHotline';
import { ServiceOtel } from '@/screens/ServiceOtel';
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
      {/* Wires Clerk's getToken into residentApi so every /me/* HTTP
          request and WS open carries an Authorization: Bearer <jwt>.
          Renders nothing; pure side-effect. Must sit INSIDE
          ClerkProvider so useAuth() resolves. */}
      <ClerkAuthBridge />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<ShellRoute />}>
              {/* CompleteProfileGate sits below ShellRoute so it gets
                  the MobileShell + Clerk context, and ABOVE every
                  in-app route so incomplete authenticated users get
                  redirected to /complete-profile. Auth + onboarding
                  paths are allow-listed inside the gate to avoid
                  redirect loops. */}
              <Route element={<CompleteProfileGate />}>
                {/* Tabbed routes share TabsLayout.
                    Guest-allowed (no RequireTenant): Community + Discover
                    are intentional marketing/brochure surfaces. Everything
                    else (Home dashboard, services, profile) is gated. */}
                <Route element={<TabsLayout />}>
                  <Route
                    path="/"
                    element={
                      <RequireTenant surfaceKey="access.surfaces.home">
                        <Home />
                      </RequireTenant>
                    }
                  />
                  {/* Community = events/announcements feed → Guest-allowed */}
                  <Route path="/community" element={<Community />} />
                  <Route
                    path="/community/neighbors"
                    element={
                      <RequireTenant surfaceKey="access.surfaces.neighbors">
                        <NeighborsDirectory />
                      </RequireTenant>
                    }
                  />
                  <Route
                    path="/services"
                    element={
                      <RequireTenant surfaceKey="access.surfaces.services">
                        <Services />
                      </RequireTenant>
                    }
                  />
                  <Route
                    path="/services/requests"
                    element={
                      <RequireTenant surfaceKey="access.surfaces.requests">
                        <ServiceRequests />
                      </RequireTenant>
                    }
                  />
                  <Route
                    path="/services/comp-map"
                    element={
                      <RequireTenant surfaceKey="access.surfaces.compoundMap">
                        <ServiceCompoundMap />
                      </RequireTenant>
                    }
                  />
                  <Route
                    path="/services/parking"
                    element={
                      <RequireTenant surfaceKey="access.surfaces.parking">
                        <ServiceParking />
                      </RequireTenant>
                    }
                  />
                  <Route
                    path="/services/smart-home"
                    element={
                      <RequireTenant surfaceKey="access.surfaces.smartHome">
                        <ServiceSmartHome />
                      </RequireTenant>
                    }
                  />
                  <Route
                    path="/services/wellness"
                    element={
                      <RequireTenant surfaceKey="access.surfaces.wellness">
                        <WellnessHub />
                      </RequireTenant>
                    }
                  />
                  <Route
                    path="/services/hotline"
                    element={
                      <RequireTenant surfaceKey="access.surfaces.services">
                        <ServiceHotline />
                      </RequireTenant>
                    }
                  />
                  <Route
                    path="/services/otel"
                    element={
                      <RequireTenant surfaceKey="access.surfaces.services">
                        <ServiceOtel />
                      </RequireTenant>
                    }
                  />
                  <Route
                    path="/services/wellness/:facilityId"
                    element={
                      <RequireTenant surfaceKey="access.surfaces.wellness">
                        <WellnessFacility />
                      </RequireTenant>
                    }
                  />
                  <Route
                    path="/services/:tileId"
                    element={
                      <RequireTenant surfaceKey="access.surfaces.services">
                        <ServiceCategory />
                      </RequireTenant>
                    }
                  />
                  <Route
                    path="/services/:tileId/providers/:providerId"
                    element={
                      <RequireTenant surfaceKey="access.surfaces.services">
                        <ServiceProvider />
                      </RequireTenant>
                    }
                  />
                  {/* Discover = brochure/sales journey → Guest-allowed */}
                  <Route path="/discover" element={<Discover />} />
                  <Route
                    path="/profile"
                    element={
                      <RequireTenant surfaceKey="access.surfaces.profile">
                        <Profile />
                      </RequireTenant>
                    }
                  />
                  <Route
                    path="/profile/family"
                    element={
                      <RequireTenant surfaceKey="access.surfaces.profile">
                        <ProfileFamily />
                      </RequireTenant>
                    }
                  />
                </Route>

                {/* Modal/full-screen routes (no tab bar) */}
                <Route
                  path="/qr"
                  element={
                    <RequireTenant surfaceKey="access.surfaces.qr">
                      <Qr />
                    </RequireTenant>
                  }
                />
                <Route
                  path="/voice"
                  element={
                    <RequireTenant surfaceKey="access.surfaces.voice">
                      <Voice />
                    </RequireTenant>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <RequireTenant surfaceKey="access.surfaces.notifications">
                      <Notifications />
                    </RequireTenant>
                  }
                />
                {/* Community sub-routes follow parent Community policy (guest-allowed) */}
                <Route path="/community/posts/:id" element={<PostDetail />} />
                <Route path="/story/:id" element={<Story />} />
                {/* Discover sub-routes are part of the sales/brochure journey */}
                <Route path="/discover/tour" element={<DiscoverTour />} />
                <Route path="/discover/master-plan" element={<DiscoverMasterPlan />} />
                <Route path="/discover/eoi" element={<DiscoverEoiHub />} />
                <Route path="/discover/eoi/contact" element={<DiscoverEoi />} />
                <Route path="/discover/calculator" element={<DiscoverCalculator />} />
                <Route path="/discover/book" element={<DiscoverBook />} />
                <Route path="/discover/story/:id" element={<DiscoverStory />} />
                {/* Booking flows = tenant-only */}
                <Route
                  path="/services/:tileId/book"
                  element={
                    <RequireTenant surfaceKey="access.surfaces.services">
                      <ServiceBook />
                    </RequireTenant>
                  }
                />
                <Route
                  path="/services/wellness/:facilityId/book"
                  element={
                    <RequireTenant surfaceKey="access.surfaces.wellness">
                      <WellnessBook />
                    </RequireTenant>
                  }
                />
                <Route
                  path="/services/parking/new-pass"
                  element={
                    <RequireTenant surfaceKey="access.surfaces.parking">
                      <ParkingNewPass />
                    </RequireTenant>
                  }
                />
                <Route
                  path="/home/parking"
                  element={
                    <RequireTenant surfaceKey="access.surfaces.home">
                      <HomeParking />
                    </RequireTenant>
                  }
                />
                <Route
                  path="/profile/family/invite"
                  element={
                    <RequireTenant surfaceKey="access.surfaces.profile">
                      <ProfileFamilyInvite />
                    </RequireTenant>
                  }
                />
                {/* Item 2 — Amenities & facilities dashboard */}
                <Route
                  path="/amenities"
                  element={
                    <RequireTenant surfaceKey="access.surfaces.amenities">
                      <AmenitiesBook />
                    </RequireTenant>
                  }
                />
                {/* Item 3 — Payments & billing hub */}
                <Route
                  path="/payments"
                  element={
                    <RequireTenant surfaceKey="access.surfaces.payments">
                      <Payments />
                    </RequireTenant>
                  }
                />

                {/* Auth routes — allow-listed inside CompleteProfileGate */}
                <Route path="/sign-in" element={<SignIn />} />
                <Route path="/sign-up" element={<SignUp />} />
                <Route path="/onboarding" element={<Onboarding />} />

                {/* Mandatory profile completion (Phase D). Lives inside
                  the gate's allow-list so the redirect can land here. */}
                <Route path="/complete-profile" element={<CompleteProfile />} />

                {/* Aliases mirroring expo-router groups */}
                <Route path="/(tabs)" element={<Navigate to="/" replace />} />

                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
