// Resident service-request history. Hydrates from MOCK_SEED_REQUESTS on
// first load, then persists all changes to localStorage so subsequent
// reloads show the same list (including any new bookings).
// TODO: API — GET/POST /api/v1/services/requests in Week 4.

import { useMemo } from 'react';
import { create } from 'zustand';

import { MOCK_SEED_REQUESTS } from '@/lib/mock/serviceRequests';
import { isActiveStatus, type ServiceRequest } from '@/lib/schemas/serviceRequest';

const STORAGE_KEY = 'stitch.serviceRequests';

function loadRequests(): ServiceRequest[] {
  if (typeof localStorage === 'undefined') return [...MOCK_SEED_REQUESTS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...MOCK_SEED_REQUESTS];
    const parsed = JSON.parse(raw) as ServiceRequest[];
    return Array.isArray(parsed) ? parsed : [...MOCK_SEED_REQUESTS];
  } catch {
    return [...MOCK_SEED_REQUESTS];
  }
}

function persistRequests(requests: ServiceRequest[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch {
    // quota / private mode — silent
  }
}

interface ServiceRequestsState {
  requests: ServiceRequest[];
  addRequest: (request: ServiceRequest) => void;
  cancelRequest: (id: string) => void;
}

export const useServiceRequestsStore = create<ServiceRequestsState>((set, get) => ({
  requests: loadRequests(),
  addRequest: (request) => {
    const next = [request, ...get().requests];
    persistRequests(next);
    set({ requests: next });
  },
  cancelRequest: (id) => {
    const next = get().requests.map((r) =>
      r.id === id ? { ...r, status: 'cancelled' as const } : r,
    );
    persistRequests(next);
    set({ requests: next });
  },
}));

/**
 * Convenience selector for the Home active-request card + open-requests pill.
 *
 * IMPORTANT: do NOT do `.filter()` inside the Zustand selector — `filter`
 * returns a fresh array reference every call, which makes Zustand's
 * `Object.is` equality fail on every render and triggers an infinite
 * re-render loop ("Maximum update depth exceeded"). Select the stable
 * raw array and memoize the derived list here instead.
 */
export function useActiveRequests(): ServiceRequest[] {
  const requests = useServiceRequestsStore((s) => s.requests);
  return useMemo(() => requests.filter((r) => isActiveStatus(r.status)), [requests]);
}
