import { useUser } from '@clerk/clerk-react';
import {
  Award,
  ChevronDown,
  ChevronRight,
  Clock,
  Cloud,
  CreditCard,
  HardHat,
  Home as HomeIcon,
  KeyRound,
  Megaphone,
  Mic,
  Moon,
  Sun,
  UserPlus,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNavigateWithTransition } from '@/lib/viewTransition';

import { UnitSwitcher } from '@/components/property/UnitSwitcher';
import { TopBar } from '@/components/TopBar';
import { AnimatedCount } from '@/components/ui/AnimatedCount';
import { useTilt } from '@/components/ui/useTilt';
import { SERVICE_TILES, TONE_BG, TONE_FG } from '@/lib/mock/services';
import { getProviderById, offeringLabelKey } from '@/lib/mock/serviceProviders';
import { colors } from '@/lib/theme';
import { useCurrentProperty } from '@/stores/propertyStore';
import { useUnreadCount } from '@/lib/useNotifications';
import { useActiveRequests } from '@/stores/serviceRequestsStore';

const MOCK_DUE_PAYMENTS = 1;

/** Tile ids surfaced on Home's "Suggested services" row — most-used resident actions. */
const SUGGESTED_TILE_IDS = [
  'daily-cleaning',
  'daily-wellness',
  'daily-home',
  'daily-laundry',
  'daily-gardening',
];

interface WeatherState {
  temp: string;
  icon: LucideIcon;
  line1: string;
  line2: string;
}

const WEATHER_STATES: WeatherState[] = [
  {
    temp: '28°',
    icon: Sun,
    line1: 'Sunny in New Cairo',
    line2: 'Perfect day for a swim — pool is open till 10 PM',
  },
  {
    temp: '24°',
    icon: Cloud,
    line1: 'Partly cloudy',
    line2: 'Comfortable evening — great for an outdoor walk',
  },
  {
    temp: '19°',
    icon: Moon,
    line1: 'Cool night',
    line2: 'Cinema night at the amphitheater starts in 2h',
  },
  {
    temp: '31°',
    icon: Sun,
    line1: 'Hot afternoon',
    line2: 'Indoor gym & co-working space are AC-cooled',
  },
];

const WEATHER_FALLBACK_BG = ['#F59E0B', '#3B82F6', '#7C3AED', '#EA580C'];

function getGreeting(firstName: string): { line1: string; line2: string; sub: string } {
  const h = new Date().getHours();
  if (h < 5)
    return {
      line1: `Up late, ${firstName}?`,
      line2: 'Quiet hours · we got you',
      sub: 'Night owl mode — Farah is awake too',
    };
  if (h < 12)
    return {
      line1: `Good morning, ${firstName}!`,
      line2: 'Have a great day',
      sub: 'Morning brief is ready below',
    };
  if (h < 17)
    return {
      line1: `Good afternoon, ${firstName}!`,
      line2: "Hope you're well",
      sub: 'Your community concierge is ready',
    };
  if (h < 21)
    return {
      line1: `Good evening, ${firstName}!`,
      line2: 'Winding down?',
      sub: 'A few things lined up for tonight',
    };
  return {
    line1: `Hi, ${firstName}!`,
    line2: 'Late night?',
    sub: 'Farah is here whenever you need',
  };
}

function getWeather(): WeatherState {
  const h = new Date().getHours();
  return WEATHER_STATES[Math.min(3, Math.floor(h / 6))]!;
}

type Tone = 'blue' | 'amber' | 'red' | 'green' | 'purple';

interface Suggestion {
  key: string;
  tone: Tone;
  Icon: LucideIcon;
  title: string;
  sub: string;
  cta: string;
  onClick: () => void;
}

const TONE_CHIP: Record<Tone, { bg: string; fg: string }> = {
  blue: { bg: '#DBEAFE', fg: '#2563EB' },
  amber: { bg: '#FEF3C7', fg: '#D97706' },
  red: { bg: '#FEE2E2', fg: '#DC2626' },
  green: { bg: '#D1FAE5', fg: '#059669' },
  purple: { bg: '#EDE9FE', fg: '#7C3AED' },
};

function SuggestionCard({ s }: { s: Suggestion }) {
  const tone = TONE_CHIP[s.tone];
  const tilt = useTilt();
  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      style={tilt.style}
      className="flex-shrink-0 w-64 mr-3 tilt-surface"
    >
      <button
        type="button"
        onClick={s.onClick}
        className="group relative w-full overflow-hidden bg-white/60 dark:bg-ink-700/60 backdrop-blur-lg rounded-2xl p-4 border border-white/40 dark:border-white/10 shadow-lg shadow-ink-900/5 text-left hover:shadow-xl hover:shadow-ink-900/10 active:scale-[0.98] transition-all duration-300 ease-smooth"
      >
        {/* Cursor-tracking specular highlight */}
        <span
          aria-hidden
          className="absolute inset-0 tilt-sheen opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />
        <div
          className="relative w-9 h-9 rounded-lg flex items-center justify-center mb-3 ring-1 ring-white/40"
          style={{ backgroundColor: tone.bg }}
        >
          <s.Icon color={tone.fg} size={18} />
        </div>
        <p className="relative text-sm font-semibold text-ink-900 dark:text-white mb-1 line-clamp-2">
          {s.title}
        </p>
        <p className="relative text-xs text-ink-500 dark:text-ink-100 mb-3 line-clamp-2">{s.sub}</p>
        <span className="relative text-xs font-semibold" style={{ color: tone.fg }}>
          {s.cta} ›
        </span>
      </button>
    </div>
  );
}

interface Cta {
  key: string;
  Icon: LucideIcon;
  title: string;
  sub: string;
  bg: string;
  fg: string;
  onClick: () => void;
}

function CtaTile({ cta }: { cta: Cta }) {
  const tilt = useTilt();
  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      style={tilt.style}
      className="flex-1 tilt-surface"
    >
      <button
        type="button"
        onClick={cta.onClick}
        className="group relative w-full overflow-hidden bg-white/60 dark:bg-ink-700/60 backdrop-blur-lg rounded-2xl p-4 flex flex-row items-center border border-white/40 dark:border-white/10 shadow-lg shadow-ink-900/5 text-left hover:shadow-xl hover:shadow-ink-900/10 active:scale-[0.98] transition-all duration-300 ease-smooth"
      >
        <span
          aria-hidden
          className="absolute inset-0 tilt-sheen opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />
        <div
          className="relative w-10 h-10 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 ring-1 ring-white/40"
          style={{ backgroundColor: cta.bg }}
        >
          <cta.Icon color={cta.fg} size={20} />
        </div>
        <div className="relative flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink-900 dark:text-white truncate">{cta.title}</p>
          <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">{cta.sub}</p>
        </div>
      </button>
    </div>
  );
}

function StatusPill({
  count,
  label,
  action,
  tint,
  bg,
  onClick,
}: {
  count: number;
  label: string;
  action: string;
  tint: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex flex-row items-center bg-white/60 dark:bg-ink-700/60 backdrop-blur-lg rounded-2xl p-3 border border-white/40 dark:border-white/10 shadow-lg shadow-ink-900/5 text-left hover:scale-[1.02] hover:shadow-xl hover:shadow-ink-900/10 active:scale-[0.98] transition-all duration-300 ease-smooth"
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mr-3 flex-shrink-0 ring-1 ring-white/40"
        style={{
          backgroundColor: bg,
          boxShadow: `0 0 14px ${tint}40`,
        }}
      >
        <span style={{ color: tint }} className="font-bold text-base tabular-nums">
          <AnimatedCount value={count} />
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-ink-900 dark:text-white truncate">{label}</p>
        <p className="text-[11px] text-ink-500 dark:text-ink-100">{action}</p>
      </div>
    </button>
  );
}

export function Home() {
  const { t } = useTranslation();
  const { user } = useUser();
  // `useNavigateWithTransition` wraps the navigation in
  // `document.startViewTransition` when supported, falling back to a
  // plain navigate otherwise. Drop-in identical API.
  const navigate = useNavigateWithTransition();
  const property = useCurrentProperty();
  const activeRequests = useActiveRequests();
  const unreadCount = useUnreadCount();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const firstName = user?.firstName ?? 'Sara';
  const greeting = useMemo(() => getGreeting(firstName), [firstName]);
  const weather = useMemo(() => getWeather(), []);
  const underConstruction = property?.handoverStatus === 'under-construction';
  const unitLabel = property ? `${property.unitName} · ${property.compoundName}` : '';
  const ownershipLabel = property ? t(`properties.ownership.${property.ownership}`) : '';
  const suggestedTiles = useMemo(
    () =>
      SUGGESTED_TILE_IDS.map((id) => SERVICE_TILES.find((tl) => tl.id === id)).filter(
        (tl): tl is (typeof SERVICE_TILES)[number] => tl !== undefined,
      ),
    [],
  );
  const latestActiveRequest = activeRequests[0];
  const latestProvider = latestActiveRequest
    ? getProviderById(latestActiveRequest.providerId)
    : undefined;

  const suggestions: Suggestion[] = useMemo(
    () => [
      {
        key: 'maintenance',
        tone: 'blue',
        Icon: Wrench,
        title: 'Track your AC repair ticket',
        sub: 'Status: Scheduled · Tap to follow up',
        cta: 'Open ticket',
        onClick: () => navigate('/services'),
      },
      {
        key: 'pool',
        tone: 'amber',
        Icon: Clock,
        title: 'Pool Party · Friday 8 PM',
        sub: '400+ residents going · RSVP now',
        cta: 'See event',
        onClick: () => navigate('/community'),
      },
      {
        key: 'payment',
        tone: 'red',
        Icon: CreditCard,
        title: 'Maintenance fee due',
        sub: 'Auto-pay can handle this for you',
        cta: 'Review',
        onClick: () => navigate('/services'),
      },
      {
        key: 'loyalty',
        tone: 'green',
        Icon: Award,
        title: "You're close to Platinum",
        sub: 'Just 240 points away — earn at outlets',
        cta: 'View rewards',
        onClick: () => navigate('/profile'),
      },
      {
        key: 'farah',
        tone: 'purple',
        Icon: Mic,
        title: 'Plan your weekend with Farah',
        sub: '"احجزلي جلسة سبا السبت" — تمام كده',
        cta: 'Talk now',
        onClick: () => navigate('/voice'),
      },
    ],
    [navigate],
  );

  const ctas: Cta[] = useMemo(
    () => [
      // For delivered units → gate access. For under-construction → swap in
      // a Construction-progress CTA (no gate yet; the owner needs the build
      // tracker far more than a QR they can't use).
      underConstruction
        ? {
            key: 'construction',
            Icon: HardHat,
            title: t('properties.construction.title'),
            sub: t('properties.construction.sub'),
            bg: '#FEF3C7',
            fg: '#D97706',
            onClick: () =>
              window.alert(
                `${t('properties.construction.title')}\n\nDetailed tracker lands in Week 5.`,
              ),
          }
        : {
            key: 'gate',
            Icon: KeyRound,
            title: t('home.cta.openGate'),
            sub: t('home.cta.openGateSub', { unit: property?.unitName ?? '' }),
            bg: '#CFFAFE',
            fg: '#0891B2',
            onClick: () => navigate('/qr'),
          },
      {
        key: 'farah',
        Icon: Mic,
        title: t('home.cta.farah'),
        sub: t('home.cta.farahSub'),
        bg: '#EDE9FE',
        fg: '#7C3AED',
        onClick: () => navigate('/voice'),
      },
      {
        key: 'invite',
        Icon: UserPlus,
        title: t('home.cta.invite'),
        sub: t('home.cta.inviteSub'),
        bg: '#DBEAFE',
        fg: '#2563EB',
        onClick: () => navigate('/qr'),
      },
      {
        key: 'report',
        Icon: Wrench,
        title: t('home.cta.report'),
        sub: t('home.cta.reportSub'),
        bg: '#FEE2E2',
        fg: '#DC2626',
        onClick: () => navigate('/services'),
      },
    ],
    [t, navigate, underConstruction, property?.unitName],
  );

  const WeatherIcon = weather.icon;
  const weatherIdx = WEATHER_STATES.indexOf(weather);
  const weatherBg = WEATHER_FALLBACK_BG[weatherIdx] ?? WEATHER_FALLBACK_BG[0];

  return (
    <>
      <TopBar title={t('app.name')} unreadCount={unreadCount} />

      <div className="p-4">
        {/* Greeting */}
        <h1 className="text-[26px] font-extrabold text-ink-900 dark:text-white leading-tight">
          {greeting.line1}
        </h1>
        <h2 className="text-[26px] font-extrabold text-ink-900 dark:text-white leading-tight mb-1">
          {greeting.line2}
        </h2>
        <p className="text-sm text-ink-500 dark:text-ink-100 mb-3">{greeting.sub}</p>

        {/* Role + unit pills */}
        <div className="flex flex-row flex-wrap items-center gap-2 mb-5">
          <span className="bg-violet-100 dark:bg-violet-900/40 px-3 py-1 rounded-full text-[11px] font-semibold text-violet-700 dark:text-violet-300">
            {ownershipLabel}
          </span>
          <button
            type="button"
            onClick={() => setSwitcherOpen(true)}
            aria-label={t('properties.switcher.title')}
            className="flex flex-row items-center bg-violet-100 dark:bg-violet-900/40 px-3 py-1 rounded-full active:scale-95 transition-transform"
          >
            <HomeIcon color="#7C3AED" size={12} />
            <span className="text-[11px] font-semibold text-violet-700 dark:text-violet-300 mx-1">
              {unitLabel}
            </span>
            <ChevronDown color="#7C3AED" size={11} />
          </button>
        </div>

        {/* Weather — Ground tier glass (ambient, recedes against the mesh) */}
        <div className="flex flex-row items-center bg-white/40 dark:bg-ink-700/40 backdrop-blur-md rounded-2xl p-3 mb-5 border border-white/40 dark:border-white/10 shadow-md shadow-ink-900/5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 ring-1 ring-white/40 shadow-md"
            style={{ backgroundColor: weatherBg, boxShadow: `0 0 18px ${weatherBg}50` }}
          >
            <WeatherIcon color="#fff" size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink-900 dark:text-white truncate">
              {weather.line1}
            </p>
            <p className="text-xs text-ink-500 dark:text-ink-100 line-clamp-2">{weather.line2}</p>
          </div>
          <span className="text-2xl font-extrabold text-ink-900 dark:text-white ml-2">
            {weather.temp}
          </span>
        </div>

        {/* For You row */}
        <div className="flex flex-row items-end justify-between mb-2">
          <div className="flex flex-row items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mr-2" />
            <span className="text-base font-bold text-ink-900 dark:text-white">
              {t('home.forYou')}
            </span>
          </div>
          <span className="text-[11px] text-ink-400">{t('home.aiPersonalized')}</span>
        </div>
        <div className="-mx-4 mb-5 px-4 overflow-x-auto no-scrollbar flex flex-row">
          {suggestions.map((s) => (
            <SuggestionCard key={s.key} s={s} />
          ))}
        </div>

        {/* Suggested services */}
        <div className="flex flex-row items-end justify-between mb-2">
          <span className="text-base font-bold text-ink-900 dark:text-white">
            {t('home.suggested.title')}
          </span>
          <button type="button" onClick={() => navigate('/services')}>
            <span className="text-xs font-semibold text-brand-500">
              {t('home.suggested.viewAll')}
            </span>
          </button>
        </div>
        <div className="-mx-4 mb-5 px-4 overflow-x-auto no-scrollbar flex flex-row gap-2">
          {suggestedTiles.map((tile) => {
            const TileIcon = tile.icon;
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => navigate(tile.to ?? `/services/${tile.id}`)}
                className="flex-shrink-0 flex flex-col items-center bg-white dark:bg-ink-700 rounded-2xl px-3 py-3 w-20 border border-ink-100 dark:border-ink-700 active:scale-[0.98] transition-transform"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-1.5"
                  style={{ backgroundColor: TONE_BG[tile.tone] }}
                >
                  <TileIcon size={18} color={TONE_FG[tile.tone]} />
                </div>
                <span className="text-[10px] font-semibold text-ink-900 dark:text-white text-center leading-tight line-clamp-2">
                  {tile.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* CTAs 2×2 */}
        <div className="flex flex-row gap-3 mb-3">
          <CtaTile cta={ctas[0]!} />
          <CtaTile cta={ctas[1]!} />
        </div>
        <div className="flex flex-row gap-3 mb-5">
          <CtaTile cta={ctas[2]!} />
          <CtaTile cta={ctas[3]!} />
        </div>

        {/* Status pills */}
        <div className="flex flex-row gap-3 mb-3">
          <StatusPill
            count={activeRequests.length}
            label={t('home.openRequests')}
            action={t('home.viewAll')}
            tint="#7C3AED"
            bg="#EDE9FE"
            onClick={() => navigate('/services/requests')}
          />
          <StatusPill
            count={MOCK_DUE_PAYMENTS}
            label={t('home.duePayments')}
            action={t('home.payNow')}
            tint="#DC2626"
            bg="#FEE2E2"
            onClick={() => navigate('/services')}
          />
        </div>

        {/* Active request card — lifted tier (this is the loudest "track me!" CTA) */}
        {latestActiveRequest && (
          <button
            type="button"
            onClick={() => navigate('/services/requests')}
            className="vt-ticket-card w-full flex flex-row items-center bg-white/80 dark:bg-ink-700/80 backdrop-blur-xl rounded-2xl p-3 mb-5 border border-white/60 dark:border-white/10 shadow-2xl shadow-purple-500/10 ring-1 ring-white/40 text-left hover:scale-[1.01] hover:shadow-purple-500/20 active:scale-[0.98] transition-all duration-300 ease-smooth"
          >
            <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center me-3 flex-shrink-0">
              <Clock color="#7C3AED" size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-700 dark:text-violet-300">
                {t('home.activeRequest.title')}
              </p>
              <p className="text-sm font-semibold text-ink-900 dark:text-white truncate">
                {latestProvider?.name ?? latestActiveRequest.providerId} ·{' '}
                {t(offeringLabelKey(latestActiveRequest.tileId, latestActiveRequest.offeringKey))}
              </p>
              <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">
                {t('home.activeRequest.scheduledFor', {
                  date: latestActiveRequest.dateIso,
                  time: latestActiveRequest.timeSlot,
                })}
              </p>
            </div>
            <ChevronRight color={colors.ink[400]} size={18} />
          </button>
        )}
        {!latestActiveRequest && <div className="mb-5" aria-hidden />}

        {/* Latest news */}
        <div className="flex flex-row items-end justify-between mb-2">
          <span className="text-base font-bold text-ink-900 dark:text-white">
            {t('home.latest')}
          </span>
          <button type="button" onClick={() => navigate('/notifications')}>
            <span className="text-xs font-semibold text-brand-500">{t('home.seeAll')}</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="w-full flex flex-row items-center bg-white dark:bg-ink-700 rounded-2xl p-3 border border-ink-100 dark:border-ink-700 text-left active:scale-[0.98] transition-transform"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center mr-3 flex-shrink-0"
            style={{ backgroundColor: '#FEF3C7' }}
          >
            <Megaphone color="#D97706" size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink-900 dark:text-white truncate">
              Water maintenance scheduled
            </p>
            <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">
              Building 4-6 · Tomorrow 10 AM – 2 PM
            </p>
          </div>
          <ChevronRight color={colors.ink[400]} size={18} />
        </button>
      </div>

      <UnitSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </>
  );
}
