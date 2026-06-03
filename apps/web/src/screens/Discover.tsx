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
          <p className="text-white/80 text-label-md mb-2">{COMPOUND.name}</p>
          <h2 className="text-display-lg text-white leading-tight mb-2">
            {t('discover.prospect.heroTitle', { compound: COMPOUND.name })}
          </h2>
          <p className="text-white/85 text-body-md mb-5 line-clamp-2">
            {t('discover.prospect.heroSub')}
          </p>
          <div className="flex flex-row gap-2">
            {/* Rule 3 (sacred dark CTA): primary lands on ink-950 over the
                hero photo; secondary is the translucent glass pill. Both
                are rounded-full per pill convention. */}
            <button
              type="button"
              onClick={() => navigate('/discover/tour')}
              className="flex-1 bg-ink-950 text-white rounded-full py-3 px-4 text-body-md font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-base ease-smooth"
            >
              {t('discover.prospect.cta.tour')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/discover/book')}
              className="flex-1 bg-white/15 backdrop-blur-md text-white border border-white/50 rounded-full py-3 px-4 text-body-md font-bold hover:bg-white/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-base ease-smooth"
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

      {/* Bottom-of-page sign-in nudge — Rule 3 dark pill, full width. */}
      <button
        type="button"
        onClick={() => navigate('/sign-in')}
        className="mt-5 w-full bg-ink-950 dark:bg-white text-white dark:text-ink-950 rounded-full py-3 flex items-center justify-center text-body-md font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-base ease-smooth"
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
      {/* Resident hero — Rule 3 sacred dark surface. Replaces the legacy
          brand/violet duotone with a single ink-950 block. The ONE accent
          on this screen lives in the tonight event cards (their gradients
          are existing data-driven art directed previously). */}
      <div className="rounded-3xl bg-ink-950 dark:bg-white text-white dark:text-ink-950 mb-5 p-6 shadow-md">
        <h2 className="text-display-lg leading-tight mb-2">{t('discover.resident.heroTitle')}</h2>
        <p className="text-body-md opacity-80 line-clamp-2">{t('discover.resident.heroSub')}</p>
      </div>

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
        className="w-full text-left flex flex-row items-center bg-white dark:bg-ink-700 rounded-3xl p-4 border border-sand-200/60 dark:border-ink-700 shadow-sm hover:shadow-md active:scale-[0.99] transition-all duration-base ease-smooth"
      >
        <div className="w-11 h-11 rounded-2xl bg-accent-50 dark:bg-accent-700/30 flex items-center justify-center me-3 flex-shrink-0 text-accent-700 dark:text-accent-300">
          <ArrowRight size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body-md font-bold text-ink-950 dark:text-white truncate">
            {t('discover.resident.marketplaceRow')}
          </p>
          <p className="text-label-sm normal-case tracking-normal font-normal text-ink-500 dark:text-ink-100 truncate">
            {t('discover.resident.marketplaceSub')}
          </p>
        </div>
        <ArrowRight className="text-ink-300 rtl:rotate-180" size={16} />
      </button>
    </>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  // Section titles read as proper headings now — restraint over uppercase
  // micro-tracker. Heading-lg lands at 18/24/600, ink-950.
  return <h4 className="text-heading-lg text-ink-950 dark:text-white mt-5 mb-2">{children}</h4>;
}

function ExploreRow({ title, sub, onClick }: { title: string; sub: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex flex-row items-center bg-white dark:bg-ink-700 rounded-3xl p-4 mb-2 border border-sand-200/60 dark:border-ink-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-base ease-smooth"
    >
      <div className="flex-1 min-w-0">
        <p className="text-body-md font-bold text-ink-950 dark:text-white truncate">{title}</p>
        <p className="text-label-sm normal-case tracking-normal font-normal text-ink-500 dark:text-ink-100 truncate">
          {sub}
        </p>
      </div>
      <ArrowRight className="text-ink-300 rtl:rotate-180" size={16} />
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
            aria-pressed={active ? 'true' : 'false'}
            className={[
              'snap-start flex-shrink-0 w-40 rounded-3xl border p-4 text-left transition-all duration-base ease-smooth shadow-sm',
              active
                ? // Rule 3: selected stop reads as the current action — ink-950
                  'bg-ink-950 dark:bg-white text-white dark:text-ink-950 border-ink-950 dark:border-white shadow-md'
                : 'bg-white dark:bg-ink-700 border-sand-200/60 dark:border-ink-700 hover:shadow-md',
            ].join(' ')}
          >
            <IconBadge Icon={stop.icon} active={active} />
            <p
              className={[
                'mt-3 text-body-md font-bold truncate',
                active ? 'text-white dark:text-ink-950' : 'text-ink-950 dark:text-white',
              ].join(' ')}
            >
              {t(stop.titleKey)}
            </p>
            <p
              className={[
                'text-label-sm normal-case tracking-normal font-normal line-clamp-2 mt-0.5',
                active ? 'text-white/75 dark:text-ink-950/70' : 'text-ink-500 dark:text-ink-100',
              ].join(' ')}
            >
              {t(stop.subKey)}
            </p>
            <p
              className={[
                'mt-2 text-label-sm',
                active ? 'text-accent-300' : 'text-ink-500 dark:text-ink-100',
              ].join(' ')}
            >
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
        'w-10 h-10 rounded-2xl flex items-center justify-center',
        active
          ? 'bg-white/15 dark:bg-ink-950/10 text-white dark:text-ink-950'
          : 'bg-sand-100 dark:bg-ink-900 text-ink-500',
      ].join(' ')}
    >
      <Icon size={18} />
    </div>
  );
}

function EventCard({ event }: { event: TonightEvent }) {
  const { t } = useTranslation();
  const { icon: Icon } = event;
  // Existing data-driven gradient art retained per art direction — this
  // is the screen's ONE accent slot. Curve upgraded to rounded-3xl.
  return (
    <Gradient from={event.gradient.from} to={event.gradient.to} radius={24}>
      <div className="p-4 flex flex-row items-center">
        <div className="w-11 h-11 rounded-2xl bg-white/25 flex items-center justify-center me-3 flex-shrink-0">
          <Icon color="#fff" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-body-md font-bold truncate">{t(event.titleKey)}</p>
          <p className="text-white/85 text-label-sm normal-case tracking-normal font-normal truncate">
            {t(event.subKey)}
          </p>
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
    <div className="flex flex-row items-center bg-white dark:bg-ink-700 rounded-3xl p-4 border border-sand-200/60 dark:border-ink-700 shadow-sm">
      <div className="w-11 h-11 rounded-2xl bg-sand-100 dark:bg-ink-900 flex items-center justify-center me-3 flex-shrink-0 text-ink-500">
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body-md font-bold text-ink-950 dark:text-white truncate">
          {t(project.titleKey)}
        </p>
        <p className="text-label-sm normal-case tracking-normal font-normal text-ink-500 dark:text-ink-100 truncate">
          {t(project.subKey)}
        </p>
      </div>
      {/* EOI chip — small ink-950 pill per Rule 3, no brand violet. */}
      <button
        type="button"
        onClick={() => navigate('/discover/eoi')}
        className="text-label-sm normal-case tracking-normal font-bold bg-ink-950 dark:bg-white text-white dark:text-ink-950 rounded-full px-3 py-1.5 hover:scale-[1.03] active:scale-[0.97] transition-transform duration-fast ease-smooth"
      >
        {t('discover.prospect.eoiCta')}
      </button>
    </div>
  );
}
