// Gate & Parking store — parking permits queue + visitor QR scan log.
// Permits start in "pending" and require admin approve/reject. QR scans are
// effectively a read-only stream — the source of truth is the security
// gate's scanner; we'd subscribe via WS in Week 7.

import { create } from 'zustand';

import { SEED_PERMITS, SEED_QR } from '@/lib/seed';
import type { ParkingPermit, PermitStatus, VisitorQrScan } from '@/lib/types';

const STORAGE_KEY = 'stitch.admin.permits';

function load(): ParkingPermit[] {
  if (typeof localStorage === 'undefined') return SEED_PERMITS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_PERMITS;
    const parsed = JSON.parse(raw) as ParkingPermit[];
    return Array.isArray(parsed) ? parsed : SEED_PERMITS;
  } catch {
    return SEED_PERMITS;
  }
}

function persist(rows: ParkingPermit[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // silent
  }
}

interface GateState {
  permits: ParkingPermit[];
  qrScans: VisitorQrScan[];
  setPermitStatus: (id: string, status: PermitStatus) => void;
}

export const useGateStore = create<GateState>((set, get) => ({
  permits: load(),
  qrScans: SEED_QR,

  setPermitStatus: (id, status) => {
    const next = get().permits.map((p) => (p.id === id ? { ...p, status } : p));
    persist(next);
    set({ permits: next });
  },
}));
