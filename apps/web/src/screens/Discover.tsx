import { useAuth } from '@clerk/clerk-react';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Gradient } from '@/components/community/Gradient';
import { DiscoverStoryRail } from '@/components/discover/DiscoverStoryRail';
import { TopBar } from '@/components/TopBar';
import { UnsplashImage } from '@/components/ui/UnsplashImage';
import { useUnreadCount } from '@/lib/useNotifications';
import {
  COMPOUND,
  OTHER_PROJECTS,
  TONIGHT_EVENTS,
  TOUR_STOPS,
  type TourStop,
  type TonightEvent,
  type OtherProject,
} from '@/lib/mock/discover';
import { useDiscoverStore } from '@/stores/discoverStore';

/**
 * Discover tab adapts to user role:
 *   - Anonymous / prospect → real-estate flows
 *   - Resident             → community flows
 * Role currently approximated from Clerk auth state; real role from API lands
 * once the users endpoint is wired in Phase 2.
 */
export function Discover() {
  const { t } = useTranslation();
  const { isSignedIn } = useAuth();
  const unreadCount = useUnreadCount();

  return (
    <>
      <TopBar title={t('discover.title')} unreadCount={unreadCount} />
      <div className="p-4 pb-8">{isSignedIn ? <ResidentView /> : <ProspectView />}</div>
    </>
  );
}

// ─── Prospect ────────────────────────────────────────────────────────────────

function ProspectView() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      {/* Lifestyle stories — bleed full-width by undoing the parent p-4 */}
      <div className="-mx-4 mb-3">
        <DiscoverStoryRail />
      </div>

      <Gradient
        from={COMPOUND.heroGradient.from}
        to={COMPOUND.heroGradient.to}
        radius={24}
        style={{ marginBottom: 20, minHeight: 220 }}
      >
        {/* Hero photo — full-bleed, with overlay for white-text contrast.
            Falls back silently to the brand gradient if the image fails. */}
        <UnsplashImage
          src={COMPOUND.heroImageUrl}
          alt={COMPOUND.name}
          fill
          loading="eager"
          overlayClassName="bg-gradient-to-t from-black/70 via-black/30 to-black/10"
        />
        <div className="relative p-6">
          <p className="text-white/80 text-[11px] font-semibold uppercase tracking-widest mb-2">
            {COMPOUND.name}
          </p>
          <h2 className="text-white text-2xl font-extrabold leading-tight mb-2">
            {t('discover.prospect.heroTitle', { compound: COMPOUND.name })}
          </h2>
          <p className="text-white/85 text-sm mb-5 line-clamp-2">
            {t('discover.prospect.heroSub')}
          </p>
          <div className="flex flex-row gap-2">
            <button
              type="button"
              onClick={() => navigate('/discover/tour')}
              className="flex-1 bg-white text-ink-900 rounded-xl py-2.5 px-3 text-sm font-semibold"
            >
              {t('discover.prospect.cta.tour')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/discover/book')}
              className="flex-1 bg-white/15 backdrop-blur text-white border border-white/40 rounded-xl py-2.5 px-3 text-sm font-semibold"
            >
              {t('discover.prospect.cta.book')}
            </button>
          </div>
        </div>
      </Gradient>

      <SectionTitle>{t('discover.prospect.exploreTitle')}</SectionTitle>
      <ExploreRow
        onClick={() => navigate('/discover/tour')}
        title={t('discover.prospect.explore.tour')}
        sub={t('discover.prospect.explore.tourSub')}
      />
      <ExploreRow
        onClick={() => navigate('/discover/master-plan')}
        title={t('discover.prospect.explore.masterPlan')}
        sub={t('discover.prospect.explore.masterPlanSub')}
      />
      <ExploreRow
        onClick={() => navigate('/discover/calculator')}
        title={t('discover.prospect.explore.calculator')}
        sub={t('discover.prospect.explore.calculatorSub')}
      />
      <ExploreRow
        onClick={() => navigate('/discover/book')}
        title={t('discover.prospect.explore.book')}
        sub={t('discover.prospect.explore.bookSub')}
      />

      <SectionTitle>{t('discover.prospect.tourPreviewTitle')}</SectionTitle>
      <TourCarousel stops={TOUR_STOPS} />

      <SectionTitle>{t('discover.prospect.othersTitle')}</SectionTitle>
      <div className="space-y-2">
        {OTHER_PROJECTS.map((p) => (
          <OtherProjectRow key={p.id} project={p} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => navigate('/sign-in')}
        className="mt-5 w-full bg-brand-500 rounded-2xl py-3 flex items-center justify-center text-white font-semibold"
      >
        {t('discover.prospect.cta.signInPrompt')}
      </button>
    </>
  );
}

// ─── Resident ────────────────────────────────────────────────────────────────

function ResidentView() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      <Gradient from="#06B6D4" to="#7C3AED" radius={24} style={{ marginBottom: 20 }}>
        <div className="p-6">
          <h2 className="text-white text-2xl font-extrabold leading-tight mb-2">
            {t('discover.resident.heroTitle')}
          </h2>
          <p className="text-white/85 text-sm line-clamp-2">{t('discover.resident.heroSub')}</p>
        </div>
      </Gradient>

      <SectionTitle>{t('discover.resident.tonightTitle')}</SectionTitle>
      <div className="space-y-2">
        {TONIGHT_EVENTS.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>

      <SectionTitle>{t('discover.resident.marketplaceTitle')}</SectionTitle>
      <button
        type="button"
        onClick={() => navigate('/services')}
        className="w-full text-left flex flex-row items-center bg-white dark:bg-ink-700 rounded-2xl p-3 border border-ink-100 dark:border-ink-700"
      >
        <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center me-3 flex-shrink-0 text-amber-600">
          <ArrowRight size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink-900 dark:text-white truncate">
            {t('discover.resident.marketplaceRow')}
          </p>
          <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">
            {t('discover.resident.marketplaceSub')}
          </p>
        </div>
        <ArrowRight color="#94A3B8" size={16} className="rtl:rotate-180" />
      </button>
    </>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-bold uppercase tracking-widest text-ink-400 mt-4 mb-2">
      {children}
    </h4>
  );
}

function ExploreRow({ title, sub, onClick }: { title: string; sub: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex flex-row items-center bg-white dark:bg-ink-700 rounded-2xl p-3 mb-2 border border-ink-100 dark:border-ink-700 hover:border-brand-400 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink-900 dark:text-white truncate">{title}</p>
        <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">{sub}</p>
      </div>
      <ArrowRight color="#94A3B8" size={16} className="rtl:rotate-180" />
    </button>
  );
}

function TourCarousel({ stops }: { stops: TourStop[] }) {
  const { t } = useTranslation();
  const { currentTourStopIndex, setTourStopIndex } = useDiscoverStore();

  return (
    <div className="flex flex-row gap-3 overflow-x-auto -mx-4 px-4 pb-2 snap-x snap-mandatory">
      {stops.map((stop, i) => {
        const active = i === currentTourStopIndex;
        return (
          <button
            key={stop.id}
            type="button"
            onClick={() => setTourStopIndex(i)}
            className={[
              'snap-start flex-shrink-0 w-40 rounded-2xl border p-4 text-left transition-all',
              active
                ? 'bg-brand-50 dark:bg-brand-700/30 border-brand-500'
                : 'bg-white dark:bg-ink-700 border-ink-100 dark:border-ink-700',
            ].join(' ')}
          >
            <IconBadge Icon={stop.icon} active={active} />
            <p className="mt-3 text-sm font-semibold text-ink-900 dark:text-white truncate">
              {t(stop.titleKey)}
            </p>
            <p className="text-[11px] text-ink-500 dark:text-ink-100 line-clamp-2 mt-0.5">
              {t(stop.subKey)}
            </p>
            <p className="mt-2 text-[10px] font-semibold text-brand-600 dark:text-brand-400">
              {t('discover.prospect.stopMin', { count: stop.durationMin })}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function IconBadge({ Icon, active }: { Icon: LucideIcon; active: boolean }) {
  return (
    <div
      className={[
        'w-9 h-9 rounded-xl flex items-center justify-center',
        active ? 'bg-brand-500 text-white' : 'bg-ink-100 dark:bg-ink-900 text-ink-500',
      ].join(' ')}
    >
      <Icon size={18} />
    </div>
  );
}

function EventCard({ event }: { event: TonightEvent }) {
  const { t } = useTranslation();
  const { icon: Icon } = event;
  return (
    <Gradient from={event.gradient.from} to={event.gradient.to} radius={18}>
      <div className="p-4 flex flex-row items-center">
        <div className="w-10 h-10 rounded-xl bg-white/25 flex items-center justify-center me-3 flex-shrink-0">
          <Icon color="#fff" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-bold truncate">{t(event.titleKey)}</p>
          <p className="text-white/85 text-[11px] truncate">{t(event.subKey)}</p>
        </div>
      </div>
    </Gradient>
  );
}

function OtherProjectRow({ project }: { project: OtherProject }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { icon: Icon } = project;
  return (
    <div className="flex flex-row items-center bg-white dark:bg-ink-700 rounded-2xl p-3 border border-ink-100 dark:border-ink-700">
      <div className="w-9 h-9 rounded-lg bg-ink-100 dark:bg-ink-900 flex items-center justify-center me-3 flex-shrink-0 text-ink-500">
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink-900 dark:text-white truncate">
          {t(project.titleKey)}
        </p>
        <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">{t(project.subKey)}</p>
      </div>
      <button
        type="button"
        onClick={() => navigate('/discover/eoi')}
        className="text-[11px] font-semibold text-brand-600 dark:text-brand-400"
      >
        {t('discover.prospect.eoiCta')}
      </button>
    </div>
  );
}
