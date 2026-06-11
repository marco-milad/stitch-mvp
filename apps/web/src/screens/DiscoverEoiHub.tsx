// /discover/eoi — international Expression of Interest hub.
//
// Four tabs that each surface a distinct path of the sales journey:
//   360° Tours       → spatial discovery, links into the existing
//                       /discover/tour standalone screen.
//   Unit Availability → live stock view (placeholder grid for now).
//   Master Plans     → compound-level plans, links into
//                       /discover/master-plan.
//   Floor Plans      → unit-level layouts (placeholder grid for now).
//
// The hub is intentionally light: each tab is a curated entry panel
// with hero card + secondary tiles. Deep flows live in the existing
// standalone screens so direct links keep working. The lead-capture
// form is preserved at /discover/eoi/contact via DiscoverEoi.tsx.

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CircleCheck,
  Compass,
  Eye,
  Layers,
  LayoutGrid,
  Map,
  Mail,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

type TabKey = 'tours' | 'availability' | 'master' | 'floor';

interface TabDef {
  key: TabKey;
  labelKey: string;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { key: 'tours', labelKey: 'discover.eoi.hub.tabs.tours', icon: Compass },
  { key: 'availability', labelKey: 'discover.eoi.hub.tabs.availability', icon: LayoutGrid },
  { key: 'master', labelKey: 'discover.eoi.hub.tabs.master', icon: Map },
  { key: 'floor', labelKey: 'discover.eoi.hub.tabs.floor', icon: Layers },
];

export function DiscoverEoiHub() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [active, setActive] = useState<TabKey>('tours');

  return (
    // Same warm cream wash as Phase B booking screens so the EOI hub
    // visually belongs to the rest of the discover journey.
    <div className="flex-1 flex flex-col bg-gradient-to-b from-amber-50/60 via-rose-50/40 to-white dark:from-ink-900 dark:via-ink-900 dark:to-ink-900">
      {/* Header */}
      <header className="flex flex-row items-center gap-3 px-4 py-3 border-b border-white/40">
        <button
          type="button"
          onClick={() => navigate('/discover')}
          aria-label={t('discover.eoi.hub.back')}
          className="w-10 h-10 -ms-2 rounded-2xl flex items-center justify-center bg-white/70 dark:bg-ink-700/70 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-sm shadow-ink-900/5 hover:bg-white hover:scale-105 active:scale-95 transition-all duration-300 ease-smooth"
        >
          <ArrowLeft size={20} className="text-ink-700 dark:text-white rtl:rotate-180" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-ink-900 dark:text-white leading-tight truncate">
            {t('discover.eoi.hub.title')}
          </h1>
          <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">
            {t('discover.eoi.hub.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/discover/eoi/contact')}
          className="inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 bg-gradient-to-br from-ink-900 to-ink-800 text-white text-xs font-semibold shadow-lg shadow-ink-900/20 hover:shadow-xl hover:shadow-ink-900/30 hover:scale-[1.02] active:scale-95 transition-all duration-300 ease-smooth"
        >
          <Mail size={12} />
          <span className="whitespace-nowrap">{t('discover.eoi.hub.contact')}</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Tab bar — curved glass pills */}
        <nav
          role="tablist"
          aria-label={t('discover.eoi.hub.title')}
          className="flex flex-row gap-2 overflow-x-auto no-scrollbar pb-1"
        >
          {TABS.map((tab) => {
            const isActive = active === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive ? 'true' : 'false'}
                aria-controls={`eoi-panel-${tab.key}`}
                id={`eoi-tab-${tab.key}`}
                onClick={() => setActive(tab.key)}
                className={[
                  'inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap border backdrop-blur-md transition-all duration-300 ease-smooth',
                  isActive
                    ? 'bg-gradient-to-br from-ink-900 to-ink-800 text-white border-ink-900 shadow-lg shadow-ink-900/25 scale-[1.03]'
                    : 'bg-white/70 dark:bg-ink-700/70 text-ink-700 dark:text-white border-white/50 dark:border-white/10 shadow-sm shadow-ink-900/5 hover:bg-white hover:scale-[1.02]',
                ].join(' ')}
              >
                <Icon size={14} />
                <span>{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </nav>

        {/* Active tab panel */}
        <section
          role="tabpanel"
          id={`eoi-panel-${active}`}
          aria-labelledby={`eoi-tab-${active}`}
          className="space-y-4"
        >
          {active === 'tours' && <ToursPanel onOpenStandalone={() => navigate('/discover/tour')} />}
          {active === 'availability' && <AvailabilityPanel />}
          {active === 'master' && (
            <MasterPanel onOpenStandalone={() => navigate('/discover/master-plan')} />
          )}
          {active === 'floor' && <FloorPanel />}
        </section>
      </div>
    </div>
  );
}

// ─── Reusable panel pieces ────────────────────────────────────────────────

function HeroCard({
  title,
  body,
  ctaLabel,
  onCta,
  Icon,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  onCta: () => void;
  Icon: LucideIcon;
}) {
  return (
    <div className="rounded-3xl border border-white/60 bg-gradient-to-br from-brand-50/80 via-white/60 to-amber-50/40 backdrop-blur-md p-5 shadow-lg shadow-brand-500/10">
      <div className="flex flex-row items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/30 ring-1 ring-white/40 flex-shrink-0">
          <Icon size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-ink-900 dark:text-white leading-tight">
            {title}
          </h2>
          <p className="text-xs text-ink-500 dark:text-ink-100 mt-1 leading-relaxed">{body}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onCta}
        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3 bg-gradient-to-br from-ink-900 to-ink-800 text-white text-sm font-semibold shadow-lg shadow-ink-900/20 hover:shadow-xl hover:shadow-ink-900/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 ease-smooth"
      >
        <span>{ctaLabel}</span>
        <ArrowRight size={16} className="rtl:rotate-180" />
      </button>
    </div>
  );
}

function MiniTile({
  title,
  body,
  comingSoon = false,
  Icon,
}: {
  title: string;
  body: string;
  comingSoon?: boolean;
  Icon: LucideIcon;
}) {
  return (
    <div className="rounded-3xl border border-white/50 bg-white/70 dark:bg-ink-700/70 backdrop-blur-md p-4 shadow-md shadow-ink-900/5 hover:shadow-lg hover:shadow-ink-900/10 hover:scale-[1.01] transition-all duration-300 ease-smooth">
      <div className="flex flex-row items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/80 border border-white/60 text-ink-500 flex-shrink-0">
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink-900 dark:text-white truncate">{title}</p>
          <p className="text-[11px] text-ink-500 dark:text-ink-100 line-clamp-2">{body}</p>
        </div>
        {comingSoon && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/80 border border-amber-200/60 rounded-2xl px-2 py-1 whitespace-nowrap">
            Soon
          </span>
        )}
      </div>
    </div>
  );
}

function PlaceholderPanel({
  title,
  body,
  bullets,
  Icon,
}: {
  title: string;
  body: string;
  bullets: string[];
  Icon: LucideIcon;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="rounded-3xl border border-white/60 bg-gradient-to-br from-amber-50/60 via-white/60 to-rose-50/40 backdrop-blur-md p-5 shadow-lg shadow-amber-500/10">
      <div className="flex flex-row items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-300 to-rose-300 text-white shadow-md shadow-amber-500/30 ring-1 ring-white/40 flex-shrink-0">
          <Icon size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-ink-900 dark:text-white leading-tight">
            {title}
          </h2>
          <p className="text-xs text-ink-500 dark:text-ink-100 mt-1 leading-relaxed">{body}</p>
        </div>
      </div>
      <ul className="space-y-2">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex flex-row items-start gap-2 text-xs text-ink-700 dark:text-ink-100"
          >
            <CircleCheck size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      {/* "Register interest to unlock" — converts the decorative
          placeholder into an active lead-generation hook. Routes
          straight into the live POST /api/v1/discover/eoi form so the
          user's interest gets captured server-side. */}
      <button
        type="button"
        onClick={() => navigate('/discover/eoi/contact')}
        className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3 bg-ink-950 dark:bg-white text-white dark:text-ink-950 text-sm font-bold shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-base ease-smooth"
      >
        <Mail size={14} />
        <span>{t('discover.eoi.hub.placeholderCta')}</span>
        <ArrowRight size={14} className="rtl:rotate-180" />
      </button>
    </div>
  );
}

// ─── Per-tab panels ───────────────────────────────────────────────────────

function ToursPanel({ onOpenStandalone }: { onOpenStandalone: () => void }) {
  const { t } = useTranslation();
  return (
    <>
      <HeroCard
        Icon={Compass}
        title={t('discover.eoi.hub.tours.heroTitle')}
        body={t('discover.eoi.hub.tours.heroBody')}
        ctaLabel={t('discover.eoi.hub.tours.openCta')}
        onCta={onOpenStandalone}
      />
      <div className="space-y-2">
        <MiniTile
          Icon={Eye}
          title={t('discover.eoi.hub.tours.tile1Title')}
          body={t('discover.eoi.hub.tours.tile1Body')}
        />
        <MiniTile
          Icon={Building2}
          title={t('discover.eoi.hub.tours.tile2Title')}
          body={t('discover.eoi.hub.tours.tile2Body')}
        />
      </div>
    </>
  );
}

function AvailabilityPanel() {
  const { t } = useTranslation();
  return (
    <PlaceholderPanel
      Icon={LayoutGrid}
      title={t('discover.eoi.hub.availability.title')}
      body={t('discover.eoi.hub.availability.body')}
      bullets={[
        t('discover.eoi.hub.availability.b1'),
        t('discover.eoi.hub.availability.b2'),
        t('discover.eoi.hub.availability.b3'),
      ]}
    />
  );
}

function MasterPanel({ onOpenStandalone }: { onOpenStandalone: () => void }) {
  const { t } = useTranslation();
  return (
    <>
      <HeroCard
        Icon={Map}
        title={t('discover.eoi.hub.master.heroTitle')}
        body={t('discover.eoi.hub.master.heroBody')}
        ctaLabel={t('discover.eoi.hub.master.openCta')}
        onCta={onOpenStandalone}
      />
      <div className="space-y-2">
        <MiniTile
          Icon={Compass}
          title={t('discover.eoi.hub.master.tile1Title')}
          body={t('discover.eoi.hub.master.tile1Body')}
        />
      </div>
    </>
  );
}

function FloorPanel() {
  const { t } = useTranslation();
  return (
    <PlaceholderPanel
      Icon={Layers}
      title={t('discover.eoi.hub.floor.title')}
      body={t('discover.eoi.hub.floor.body')}
      bullets={[
        t('discover.eoi.hub.floor.b1'),
        t('discover.eoi.hub.floor.b2'),
        t('discover.eoi.hub.floor.b3'),
      ]}
    />
  );
}
