// Route-level role gates. Sit inside App.tsx route definitions to
// declaratively express "this surface needs at least Tenant" or "this
// surface is Owner-only".
//
// Pattern:
//   <Route path="/services" element={<RequireTenant><Services /></RequireTenant>} />
//
// When the active role doesn't meet the threshold, the GuestLockedFallback
// renders inside the same shell — branded "Sign up to unlock" surface
// instead of a hard redirect, so the route stays bookmarkable + the
// user understands what they're missing.

import { Lock, Sparkles, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { hasAtLeastRole, useAccessRole, type AccessRole } from '@/stores/accessRoleStore';

interface RequireRoleProps {
  children: ReactNode;
  /** What the user is being locked out from — drives the headline of
   *  the fallback screen so it reads "Sign up to unlock Maintenance
   *  Requests" instead of a generic message. */
  surfaceKey?: string;
}

function GateFor({ required, children, surfaceKey }: RequireRoleProps & { required: AccessRole }) {
  const role = useAccessRole();
  if (hasAtLeastRole(role, required)) return <>{children}</>;
  return <GuestLockedFallback surfaceKey={surfaceKey} />;
}

/** Tenant + Owner pass; Guest hits the fallback. Use for most resident
 *  surfaces — services, QR, voice, profile, payments, etc. */
export function RequireTenant({ children, surfaceKey }: RequireRoleProps) {
  return (
    <GateFor required="tenant" surfaceKey={surfaceKey}>
      {children}
    </GateFor>
  );
}

/** Owner-only. Use for ownership-specific actions (transfer, structural
 *  changes, etc.). Tenants + Guests hit the fallback. */
export function RequireOwner({ children, surfaceKey }: RequireRoleProps) {
  return (
    <GateFor required="owner" surfaceKey={surfaceKey}>
      {children}
    </GateFor>
  );
}

// ─── Fallback screen ──────────────────────────────────────────────────────

function GuestLockedFallback({ surfaceKey }: { surfaceKey?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // i18n: pull a surface-specific label when one was passed (so the
  // fallback says "to access Maintenance Requests" instead of the
  // generic copy). Falls back to the generic key.
  const surfaceLabel = surfaceKey ? t(surfaceKey) : t('access.locked.defaultSurface');

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-amber-50/60 via-rose-50/40 to-white dark:from-ink-900 dark:via-ink-900 dark:to-ink-900">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-md mx-auto w-full text-center">
        <Badge Icon={Lock} />
        <h1 className="text-2xl font-extrabold text-ink-900 dark:text-white leading-tight mb-2">
          {t('access.locked.title')}
        </h1>
        <p className="text-sm text-ink-500 dark:text-ink-100 mb-1.5">
          {t('access.locked.body', { surface: surfaceLabel })}
        </p>
        <p className="text-xs text-ink-400 mb-7">{t('access.locked.guestNote')}</p>
        <button
          type="button"
          onClick={() => navigate('/sign-up')}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 bg-gradient-to-br from-ink-900 to-ink-800 text-white text-sm font-semibold shadow-lg shadow-ink-900/20 hover:shadow-xl hover:shadow-ink-900/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 ease-smooth"
        >
          <Sparkles size={16} />
          <span>{t('access.locked.signUpCta')}</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/discover')}
          className="mt-2.5 w-full inline-flex items-center justify-center rounded-2xl py-3 bg-white/70 dark:bg-ink-700/70 backdrop-blur-md border border-white/50 dark:border-white/10 text-ink-700 dark:text-white text-sm font-semibold shadow-md shadow-ink-900/5 hover:bg-white hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 ease-smooth"
        >
          {t('access.locked.browseCta')}
        </button>
      </div>
    </div>
  );
}

function Badge({ Icon }: { Icon: LucideIcon }) {
  return (
    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-200 to-rose-200 backdrop-blur-md border border-white/60 shadow-xl shadow-amber-500/20 ring-1 ring-white/40 flex items-center justify-center mb-5 text-amber-800">
      <Icon size={36} />
    </div>
  );
}
