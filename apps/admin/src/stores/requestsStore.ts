// Service requests store — admin can assign technicians and update status.
// Seeded from SEED_REQUESTS, persisted to localStorage.
//
// IMPORTANT: select raw arrays and derive in useMemo. See
// [[feedback-zustand-selectors]] for why.

import { create } from 'zustand';

import { SEED_REQUESTS, SEED_TECHS } from '@/lib/seed';
import type { RequestStatus, ServiceRequest, Technician } from '@/lib/types';

const STORAGE_KEY = 'stitch.admin.requests';

function load(): ServiceRequest[] {
  if (typeof localStorage === 'undefined') return SEED_REQUESTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_REQUESTS;
    const parsed = JSON.parse(raw) as ServiceRequest[];
    return Array.isArray(parsed) ? parsed : SEED_REQUESTS;
  } catch {
    return SEED_REQUESTS;
  }
}

function persist(rows: ServiceRequest[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // silent
  }
}

interface RequestsState {
  requests: ServiceRequest[];
  technicians: Technician[];
  assign: (requestId: string, technicianId: string) => void;
  setStatus: (requestId: string, status: RequestStatus) => void;
}

export const useRequestsStore = create<RequestsState>((set, get) => ({
  requests: load(),
  technicians: SEED_TECHS,

  assign: (requestId, technicianId) => {
    const next = get().requests.map((r) =>
      r.id === requestId
        ? { ...r, assigneeId: technicianId, status: 'assigned' as RequestStatus }
        : r,
    );
    persist(next);
    set({ requests: next });
  },

  setStatus: (requestId, status) => {
    const next = get().requests.map((r) => (r.id === requestId ? { ...r, status } : r));
    persist(next);
    set({ requests: next });
  },
}));
