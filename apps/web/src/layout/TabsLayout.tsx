import { Briefcase, Compass, Home, QrCode, User, Users, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { MeshBackground } from '@/components/ui/MeshBackground';
import { colors } from '@/lib/theme';

interface TabDef {
  to: string;
  title: string;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { to: '/', title: 'Home', icon: Home },
  { to: '/community', title: 'Community', icon: Users },
  { to: '/services', title: 'Services', icon: Briefcase },
  { to: '/discover', title: 'Discover', icon: Compass },
  { to: '/profile', title: 'Profile', icon: User },
];

const FAB_SIZE = 56;

/**
 * Custom tab bar mirroring the mobile design:
 *   Home | Community | [FAB → /qr] | Services | Discover | Profile
 * The FAB slot is wider (flex 1.3) so the circular QR button breathes.
 */
export function TabsLayout() {
  const navigate = useNavigate();

  const renderTab = (tab: TabDef, idx: number) => (
    <NavLink
      key={tab.to}
      to={tab.to}
      end={tab.to === '/'}
      // Brand identity: active tabs render ink-950 (sacred dark), inactive
      // ink-300 (subtle). No brand-cyan in the chrome — strict neutrality.
      className={({ isActive }) =>
        `flex-1 flex flex-col items-center justify-center px-1 ${
          isActive ? 'text-ink-950 dark:text-white' : 'text-ink-300'
        }`
      }
      style={{ minWidth: 0 }}
      aria-label={tab.title}
      data-tab-idx={idx}
    >
      {({ isActive }) => {
        const Icon = tab.icon;
        const tint = isActive ? colors.ink[950] : colors.ink[300];
        return (
          <>
            <Icon color={tint} size={20} strokeWidth={isActive ? 2.25 : 1.75} />
            <span
              className="text-caption normal-case tracking-normal font-semibold mt-0.5 whitespace-nowrap"
              style={{ color: tint }}
            >
              {tab.title}
            </span>
          </>
        );
      }}
    </NavLink>
  );

  return (
    <>
      {/* Animated mesh backdrop — three blurred blobs drifting on independent
          eases give the whole app a living, never-quite-repeating wash for
          the glass cards to blur over. */}
      <MeshBackground tone="pastel" />

      {/* Screen content fills above the tab bar */}
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>

      {/* Bottom tab bar — Brand rule 1 (sand surface + frosted glass) +
          rule 4 (soft layered shadow). Border softens to sand-200 so the
          bar reads as an integral part of the warm cream surface, not a
          surgical line. */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40">
        <div className="flex flex-row bg-white/80 dark:bg-ink-900/80 backdrop-blur-xl border-t border-sand-200/60 dark:border-white/10 shadow-lg safe-bottom h-16">
          {renderTab(TABS[0]!, 0)}
          {renderTab(TABS[1]!, 1)}

          {/* FAB slot — Rule 3 (sacred dark CTA): the primary action across
              the app lives here, so it earns the ink-950 pill treatment
              with a soft md shadow and the snap-in/out ease pair. */}
          <div className="flex items-center justify-center" style={{ flex: 1.3 }}>
            <button
              type="button"
              onClick={() => navigate('/qr')}
              aria-label="Open QR & access"
              className="rounded-full bg-ink-950 dark:bg-white text-white dark:text-ink-950 flex items-center justify-center shadow-md hover:shadow-lg ring-2 ring-white/80 dark:ring-ink-900/60 hover:scale-[1.04] active:scale-95 transition-all duration-base ease-smooth"
              style={{
                width: FAB_SIZE,
                height: FAB_SIZE,
                marginTop: -FAB_SIZE / 2 - 6,
              }}
            >
              <QrCode color="currentColor" size={26} strokeWidth={2.25} />
            </button>
          </div>

          {renderTab(TABS[2]!, 2)}
          {renderTab(TABS[3]!, 3)}
          {renderTab(TABS[4]!, 4)}
        </div>
      </div>
    </>
  );
}
