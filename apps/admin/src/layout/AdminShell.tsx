import {
  Calendar,
  ChevronDown,
  LayoutGrid,
  Languages,
  LogOut,
  Megaphone,
  ParkingCircle,
  Wrench,
} from 'lucide-react';
import type { ReactNode } from 'react';
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
  { to: '/gate', labelKey: 'nav.gate', icon: <ParkingCircle size={18} /> },
];

function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const next = i18n.language === 'ar' ? 'en' : 'ar';
  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(next)}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-700 bg-white/40 hover:bg-white/70 border border-white/50 backdrop-blur-sm hover:scale-[1.04] active:scale-95 transition-all duration-200"
    >
      <Languages size={14} />
      <span>{t('nav.lang')}</span>
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

export function AdminShell() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const activeLabel = NAV.find((n) => pathname.startsWith(n.to))?.labelKey;

  return (
    <div className="min-h-screen flex flex-row relative">
      {/* Pastel gradient backdrop — fixed so it stays put while content scrolls. */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-br from-sky-50 via-violet-50 to-pink-50"
      />

      {/* Sidebar — frosted glass */}
      <aside className="w-64 shrink-0 bg-white/55 backdrop-blur-lg border-e border-white/40 shadow-[8px_0_32px_rgba(15,23,42,0.04)] flex flex-col">
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

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300',
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
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-ink-700 hover:bg-white/50 hover:scale-[1.02] transition-all duration-200"
          >
            <LogOut size={14} />
            <span>{t('nav.signOut')}</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 bg-white/55 backdrop-blur-lg border-b border-white/40 shadow-[0_4px_24px_rgba(15,23,42,0.04)] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <Calendar size={14} />
            <span>
              {new Intl.DateTimeFormat(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }).format(new Date())}
            </span>
            {activeLabel && (
              <>
                <ChevronDown size={12} className="text-ink-400 rotate-[-90deg] rtl:rotate-90" />
                <span className="font-semibold text-ink-700">{t(activeLabel)}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ConnectionPill />
            <LanguageToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
