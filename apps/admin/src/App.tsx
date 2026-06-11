import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AdminShell } from '@/layout/AdminShell';
import { useFeedSync } from '@/lib/useFeedSync';
import { ContentManagement } from '@/screens/ContentManagement';
import { GateOps } from '@/screens/GateOps';
import { Leads } from '@/screens/Leads';
import { NotFound } from '@/screens/NotFound';
import { ServiceBookings } from '@/screens/ServiceBookings';
import { ServiceRequests } from '@/screens/ServiceRequests';

function FeedSyncRoot({ children }: { children: React.ReactNode }) {
  useFeedSync();
  return <>{children}</>;
}

export function App() {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: true,
            staleTime: 30_000,
          },
        },
      }),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <FeedSyncRoot>
        <BrowserRouter>
          <Routes>
            <Route element={<AdminShell />}>
              <Route path="/" element={<Navigate to="/content" replace />} />
              <Route path="/content" element={<ContentManagement />} />
              <Route path="/requests" element={<ServiceRequests />} />
              <Route path="/bookings" element={<ServiceBookings />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/gate" element={<GateOps />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </FeedSyncRoot>
    </QueryClientProvider>
  );
}
