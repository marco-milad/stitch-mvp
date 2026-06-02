// Access-tier guard components.
//
//   <GuestGuard>   — content visible to GUEST role only. Use for
//                    "Sign up to unlock more" CTAs, guest-mode banners.
//
//   <TenantGuard>  — content visible to TENANT or OWNER. Locks GUESTS
//                    out. Wrap most resident-only surfaces (services,
//                    QR, gate, profile editing) in this.
//
//   <OwnerGuard>   — content visible to OWNER only. Use for
//                    ownership-specific actions (transfer, structural
//                    changes, etc.).
//
// Each guard accepts an optional `fallback` to render when the role
// doesn't match. Default fallback is null (render nothing). Pass a
// branded "Sign up to access" tile for the marketing path.

import type { ReactNode } from 'react';

import { hasAtLeastRole, useAccessRole, type AccessRole } from '@/stores/accessRoleStore';

interface GuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

function GuardFor({ required, children, fallback = null }: GuardProps & { required: AccessRole }) {
  const role = useAccessRole();
  return hasAtLeastRole(role, required) ? <>{children}</> : <>{fallback}</>;
}

/** Renders for guests, tenants, and owners (no-op gate, useful as
 *  documentation that a surface is intentionally guest-allowed). */
export function GuestGuard({ children, fallback }: GuardProps) {
  return <GuardFor required="guest" children={children} fallback={fallback} />;
}

/** Renders for tenants and owners. Guests see the fallback. */
export function TenantGuard({ children, fallback }: GuardProps) {
  return <GuardFor required="tenant" children={children} fallback={fallback} />;
}

/** Renders for owners only. Tenants and guests see the fallback. */
export function OwnerGuard({ children, fallback }: GuardProps) {
  return <GuardFor required="owner" children={children} fallback={fallback} />;
}

/** Inverse — content visible ONLY when the user is a guest. Use for
 *  the "Sign up to unlock" CTAs and brochure-only navigation. */
export function GuestOnly({ children, fallback = null }: GuardProps) {
  const role = useAccessRole();
  return role === 'guest' ? <>{children}</> : <>{fallback}</>;
}
