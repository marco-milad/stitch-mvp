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
      className={({ isActive }) =>
        `flex-1 flex flex-col items-center justify-center px-1 ${
          isActive ? 'text-brand-500' : 'text-ink-400'
        }`
      }
      style={{ minWidth: 0 }}
      aria-label={tab.title}
      data-tab-idx={idx}
    >
      {({ isActive }) => {
        const Icon = tab.icon;
        const tint = isActive ? colors.brand[500] : colors.ink[400];
        return (
          <>
            <Icon color={tint} size={20} />
            <span className="text-[10px] mt-0.5 whitespace-nowrap" style={{ color: tint }}>
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

      {/* Bottom tab bar — frosted glass */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40">
        <div className="flex flex-row bg-white/60 dark:bg-ink-900/60 backdrop-blur-lg border-t border-white/40 dark:border-white/10 shadow-[0_-8px_32px_rgba(15,23,42,0.08)] safe-bottom h-16">
          {renderTab(TABS[0]!, 0)}
          {renderTab(TABS[1]!, 1)}

          {/* FAB slot */}
          <div className="flex items-center justify-center" style={{ flex: 1.3 }}>
            <button
              type="button"
              onClick={() => navigate('/qr')}
              aria-label="Open QR & access"
              className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-xl shadow-brand-500/40 ring-1 ring-white/40 hover:scale-[1.04] active:scale-95 transition-all duration-200"
              style={{
                width: FAB_SIZE,
                height: FAB_SIZE,
                marginTop: -FAB_SIZE / 2 - 6,
              }}
            >
              <QrCode color={colors.white} size={26} />
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
