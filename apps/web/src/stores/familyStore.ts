// Family roster + permission state. Persisted to localStorage so invites,
// removals, and per-permission toggles survive reloads.
//
// Selector rule [[feedback-zustand-selectors]]: never `.filter()` inside a
// Zustand selector — it returns a new reference every render and triggers
// an infinite loop. Select raw, derive with useMemo.

import { useMemo } from 'react';
import { create } from 'zustand';

import { MOCK_SEED_MEMBERS } from '@/lib/mock/family';
import type { FamilyMember, PermissionKey } from '@/lib/schemas/family';
import { usePropertyStore } from '@/stores/propertyStore';

const STORAGE_KEY = 'stitch.family';

function loadMembers(): FamilyMember[] {
  if (typeof localStorage === 'undefined') return [...MOCK_SEED_MEMBERS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...MOCK_SEED_MEMBERS];
    const parsed = JSON.parse(raw) as FamilyMember[];
    return Array.isArray(parsed) ? parsed : [...MOCK_SEED_MEMBERS];
  } catch {
    return [...MOCK_SEED_MEMBERS];
  }
}

function persist(members: FamilyMember[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  } catch {
    // quota / private mode — silent
  }
}

interface FamilyState {
  members: FamilyMember[];
  addMember: (member: FamilyMember) => void;
  removeMember: (id: string) => void;
  togglePermission: (id: string, perm: PermissionKey) => void;
  resendInvite: (id: string) => void;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  members: loadMembers(),
  addMember: (member) => {
    const next = [member, ...get().members];
    persist(next);
    set({ members: next });
  },
  removeMember: (id) => {
    const next = get().members.filter((m) => m.id !== id);
    persist(next);
    set({ members: next });
  },
  togglePermission: (id, perm) => {
    const next = get().members.map((m) =>
      m.id === id ? { ...m, permissions: { ...m.permissions, [perm]: !m.permissions[perm] } } : m,
    );
    persist(next);
    set({ members: next });
  },
  resendInvite: (id) => {
    const next = get().members.map((m) =>
      m.id === id ? { ...m, invitedAt: new Date().toISOString(), status: 'pending' as const } : m,
    );
    persist(next);
    set({ members: next });
  },
}));

/** Members scoped to the current property. */
export function useMembersForCurrentProperty(): FamilyMember[] {
  const propertyId = usePropertyStore((s) => s.currentPropertyId);
  const members = useFamilyStore((s) => s.members);
  return useMemo(() => members.filter((m) => m.propertyId === propertyId), [members, propertyId]);
}
