// Access-tier role for the current session. Distinct from property
// `ownership` (which describes the resident's relationship to a
// specific unit). `role` controls which surfaces of the app the user
// can reach at all:
//
//   guest  — browsing tier. Brochures, newsletter, events. No
//            services, no QR, no profile editing.
//   tenant — full resident with rental relationship.
//   owner  — full resident with ownership.
//
// Hierarchy (most access on top):
//   owner  ⊇  tenant  ⊇  guest
//
// Defaults to `owner` so existing demo flows keep working unchanged.
// Persisted to localStorage so the choice survives reloads.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AccessRole = 'guest' | 'tenant' | 'owner';

interface AccessRoleState {
  role: AccessRole;
  setRole: (role: AccessRole) => void;
}

export const useAccessRoleStore = create<AccessRoleState>()(
  persist(
    (set) => ({
      role: 'owner',
      setRole: (role) => set({ role }),
    }),
    { name: 'stitch.accessRole' },
  ),
);

export const useAccessRole = (): AccessRole => useAccessRoleStore((s) => s.role);

// Hierarchy helpers — `hasAtLeastRole(target)` returns true when the
// current role sits at the target tier or above. Owners beat
// tenants beat guests.
const ORDER: AccessRole[] = ['guest', 'tenant', 'owner'];

export function hasAtLeastRole(current: AccessRole, target: AccessRole): boolean {
  return ORDER.indexOf(current) >= ORDER.indexOf(target);
}
