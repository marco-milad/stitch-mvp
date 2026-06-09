// AdminShell — responsive frame for the ops dashboard.
//
// Desktop (≥ md):
//   Sidebar (264px, glass) on the start edge, sticky content header,
//   scrollable main. Unchanged from the prior premium layout.
//
// Mobile (< md):
//   Sidebar is hidden by default and morphs into a slide-in drawer
//   toggled from a sticky glass header bar at the top. Backdrop dims
//   the page + closes the drawer on tap. The drawer slides in from
//   the start edge (LTR) or end edge (RTL) using `ease-smooth` over
//   300ms.

import {
  Calendar,
  ChevronDown,
  LayoutGrid,
  Languages,
  LogOut,
  Megaphone,
  Menu,
  ParkingCircle,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { useFeedStore } from '@/stores/feedStore';

interface NavEntry {
  to: string;
  labelKey: string;
  icon: ReactNode;
}

const NAV: NavEntry[] = [
  { to: '/content', labelKey: 'nav.content', icon: <Megaphone size={18} /> },
  { to: '/requests', labelKey: 'nav.requests', icon: <Wrench size={18} /> },
  { to: '/bookings', labelKey: 'nav.bookings', icon: <Sparkles size={18} /> },
  { to: '/gate', labelKey: 'nav.gate', icon: <ParkingCircle size={18} /> },
];

function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const next = i18n.language === 'ar' ? 'en' : 'ar';
  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(next)}
      className="inline-flex items-center gap-2 px-3 min-h-[44px] sm:min-h-0 sm:py-1.5 rounded-lg text-xs font-semibold text-ink-700 bg-white/40 hover:bg-white/70 border border-white/50 backdrop-blur-sm hover:scale-[1.04] active:scale-95 transition-all duration-200 ease-smooth"
    >
      <Languages size={14} />
      <span className="hidden sm:inline">{t('nav.lang')}</span>
    </button>
  );
}

function ConnectionPill() {
  const connected = useFeedStore((s) => s.connected);
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border backdrop-blur-sm transition-all duration-300',
        connected
          ? 'bg-emerald-50/70 border-emerald-300/60 text-emerald-700 shadow-[0_0_14px_rgba(16,185,129,0.4)]'
          : 'bg-ink-100/60 border-ink-200/60 text-ink-500',
      ].join(' ')}
    >
      <span
        className={[
          'w-1.5 h-1.5 rounded-full',
          connected ? 'bg-emerald-500 animate-pulse' : 'bg-ink-400',
        ].join(' ')}
      />
      {connected ? 'LIVE' : 'OFFLINE'}
    </span>
  );
}

// ─── Sidebar content (shared between desktop sidebar + mobile drawer) ─────

function SidebarContent({ onNavClick, t }: { onNavClick: () => void; t: (k: string) => string }) {
  return (
    <>
      <div className="px-5 py-5 border-b border-white/40">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-brand-500 to-accent text-white shadow-md shadow-brand-500/30 ring-1 ring-white/40">
            <LayoutGrid size={18} />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-ink-900">{t('app.title')}</div>
            <div className="text-[11px] text-ink-500">{t('app.tagline')}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            onClick={onNavClick}
            className={({ isActive }) =>
              [
                // Touch-friendly: explicit 44px min on mobile, falls back
                // to compact on desktop where pointer events are precise.
                'flex items-center gap-3 px-3 min-h-[44px] md:min-h-0 md:py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-smooth',
                isActive
                  ? 'bg-gradient-to-r from-brand-100/80 to-brand-50/60 text-brand-700 shadow-md shadow-brand-500/15 ring-1 ring-brand-200/50'
                  : 'text-ink-700 hover:bg-white/50 hover:scale-[1.02]',
              ].join(' ')
            }
          >
            <span className="flex-shrink-0">{n.icon}</span>
            <span className="flex-1 truncate">{t(n.labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-white/40 flex flex-col gap-1">
        <div className="px-3 py-2 rounded-lg bg-white/55 backdrop-blur-sm border border-white/50 shadow-sm">
          <div className="text-[11px] text-ink-500">{t('auth.signedInAs')}</div>
          <div className="text-sm font-semibold text-ink-900">Sara Hassan</div>
          <div className="text-[11px] text-brand-700 font-semibold">{t('auth.role')}</div>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-3 min-h-[44px] md:min-h-0 md:py-2 rounded-lg text-xs text-ink-700 hover:bg-white/50 hover:scale-[1.02] transition-all duration-200 ease-smooth"
        >
          <LogOut size={14} />
          <span>{t('nav.signOut')}</span>
        </button>
      </div>
    </>
  );
}

export function AdminShell() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const activeLabel = NAV.find((n) => pathname.startsWith(n.to))?.labelKey;
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer on route change — covers the case where the user
  // taps a nav entry. (NavLink's own onClick already calls this, but
  // belt-and-suspenders for back/forward gestures.)
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer is open so the page underneath
  // doesn't bounce when the user scrolls inside the drawer.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-screen flex flex-row relative">
      {/* Pastel gradient backdrop — fixed so it stays put while content scrolls. */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-br from-sky-50 via-violet-50 to-pink-50"
      />

      {/* Desktop sidebar — only renders at md+ */}
      <aside className="hidden md:flex w-64 shrink-0 bg-white/55 backdrop-blur-lg border-e border-white/40 shadow-[8px_0_32px_rgba(15,23,42,0.04)] flex-col">
        <SidebarContent onNavClick={() => {}} t={t} />
      </aside>

      {/* Mobile drawer + backdrop — only renders below md */}
      <div className="md:hidden">
        {/* Backdrop — fades in/out; click to close */}
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={drawerOpen ? 0 : -1}
          onClick={() => setDrawerOpen(false)}
          className={[
            'fixed inset-0 z-30 bg-ink-900/50 backdrop-blur-sm transition-opacity duration-300 ease-smooth',
            drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
          ].join(' ')}
        />
        {/* Drawer panel — slides from start edge (LTR) / end edge (RTL) */}
        <aside
          aria-hidden={drawerOpen ? 'false' : 'true'}
          className={[
            'fixed top-0 bottom-0 z-40 w-72 max-w-[85vw] bg-white/85 backdrop-blur-xl border-e border-white/40 shadow-2xl shadow-ink-900/20 flex flex-col',
            // start-0 in LTR maps to left:0; rtl:start-0 mirrors to right:0
            'start-0',
            'transition-transform duration-300 ease-smooth',
            // Translate off-screen on the start edge when closed. Tailwind
            // doesn't ship logical-direction transforms, so we cover both.
            drawerOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full',
          ].join(' ')}
        >
          <SidebarContent onNavClick={() => setDrawerOpen(false)} t={t} />
        </aside>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header — sticky on all viewports. Hamburger only shows below md. */}
        <header className="sticky top-0 z-20 bg-white/55 backdrop-blur-lg border-b border-white/40 shadow-[0_4px_24px_rgba(15,23,42,0.04)] px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              aria-expanded={drawerOpen ? 'true' : 'false'}
              className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg bg-white/60 hover:bg-white/80 border border-white/40 backdrop-blur-md active:scale-95 transition-all duration-200 ease-smooth"
            >
              {drawerOpen ? (
                <X size={20} className="text-ink-700" />
              ) : (
                <Menu size={20} className="text-ink-700" />
              )}
            </button>
            <div className="hidden sm:flex items-center gap-2 text-sm text-ink-500 min-w-0">
              <Calendar size={14} className="flex-shrink-0" />
              <span className="truncate">
                {new Intl.DateTimeFormat(undefined, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }).format(new Date())}
              </span>
            </div>
            {activeLabel && (
              <>
                <ChevronDown
                  size={12}
                  className="hidden sm:block text-ink-400 rotate-[-90deg] rtl:rotate-90 flex-shrink-0"
                />
                <span className="font-semibold text-ink-700 text-sm truncate">
                  {t(activeLabel)}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <ConnectionPill />
            <LanguageToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
