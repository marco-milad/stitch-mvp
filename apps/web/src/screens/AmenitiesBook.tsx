// /amenities — premium amenities & facilities booking dashboard.
//
// Three distinct flows scaffolded behind one curved-glass surface:
//   - Pools         (lap, family, kids)
//   - Gyms          (cardio, weights, group classes)
//   - Workspaces    (hot desks, private rooms, meeting rooms)
//
// Each tile is a tap-to-book card with availability hint + facility
// rating. The header carries the My OTEL Booking shortcut so the
// hotel-partner flow stays one tap away from any amenity surface.
//
// Booking data is mock for now — Week 3 wire-up replaces the static
// arrays with `GET /api/v1/amenities` + `POST /api/v1/amenities/book`.

import {
  ArrowLeft,
  CalendarClock,
  Dumbbell,
  MapPin,
  Sparkles,
  Star,
  Users,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { OtelBookingButton } from '@/components/booking/OtelBookingButton';

type AmenityKind = 'pool' | 'gym' | 'workspace';

interface AmenityFacility {
  id: string;
  kind: AmenityKind;
  name: string;
  blurb: string;
  /** e.g. "Open · 6 slots today" */
  availability: string;
  /** 0–5 community rating. */
  rating: number;
  /** Mock distance label. */
  distance: string;
  Icon: LucideIcon;
}

const POOLS: AmenityFacility[] = [
  {
    id: 'pool-1',
    kind: 'pool',
    name: 'Main lap pool',
    blurb: '50 m heated · 6 lanes · adults only after 7 PM',
    availability: 'Open · 8 lanes today',
    rating: 4.8,
    distance: '2 min walk',
    Icon: Waves,
  },
  {
    id: 'pool-2',
    kind: 'pool',
    name: 'Family pool',
    blurb: 'Zero-entry · shaded loungers · café access',
    availability: 'Open · few slots after 4 PM',
    rating: 4.6,
    distance: '4 min walk',
    Icon: Waves,
  },
  {
    id: 'pool-3',
    kind: 'pool',
    name: "Kids' splash zone",
    blurb: 'Slides · lifeguard on duty · ages 3–10',
    availability: 'Open · book by the hour',
    rating: 4.7,
    distance: '4 min walk',
    Icon: Waves,
  },
];

const GYMS: AmenityFacility[] = [
  {
    id: 'gym-1',
    kind: 'gym',
    name: 'Cardio floor',
    blurb: 'Treadmills · bikes · rowers · Peloton',
    availability: 'Open · 12 machines free',
    rating: 4.5,
    distance: '3 min walk',
    Icon: Dumbbell,
  },
  {
    id: 'gym-2',
    kind: 'gym',
    name: 'Strength & weights',
    blurb: 'Free weights · cable machines · racks',
    availability: 'Open · busy 5–8 PM',
    rating: 4.7,
    distance: '3 min walk',
    Icon: Dumbbell,
  },
  {
    id: 'gym-3',
    kind: 'gym',
    name: 'Group studio',
    blurb: 'HIIT · yoga · pilates · spin classes',
    availability: 'Next class 6 PM today',
    rating: 4.8,
    distance: '3 min walk',
    Icon: Dumbbell,
  },
];

const WORKSPACES: AmenityFacility[] = [
  {
    id: 'work-1',
    kind: 'workspace',
    name: 'Co-working lounge',
    blurb: 'Hot desks · monitors · espresso bar',
    availability: 'Open · 14 desks free',
    rating: 4.7,
    distance: '5 min walk',
    Icon: Users,
  },
  {
    id: 'work-2',
    kind: 'workspace',
    name: 'Private offices',
    blurb: 'Lockable · 1–4 person · daily / hourly',
    availability: '3 offices free today',
    rating: 4.6,
    distance: '5 min walk',
    Icon: Users,
  },
  {
    id: 'work-3',
    kind: 'workspace',
    name: 'Meeting rooms',
    blurb: 'Glass walls · 4K display · whiteboard',
    availability: '6 rooms · book in 30-min slots',
    rating: 4.7,
    distance: '5 min walk',
    Icon: Users,
  },
];

const SECTIONS: ReadonlyArray<{ key: AmenityKind; labelKey: string; data: AmenityFacility[] }> = [
  { key: 'pool', labelKey: 'amenities.sections.pools', data: POOLS },
  { key: 'gym', labelKey: 'amenities.sections.gyms', data: GYMS },
  { key: 'workspace', labelKey: 'amenities.sections.workspaces', data: WORKSPACES },
];

const FILTERS: ReadonlyArray<{ key: AmenityKind | 'all'; labelKey: string; Icon: LucideIcon }> = [
  { key: 'all', labelKey: 'amenities.filters.all', Icon: Sparkles },
  { key: 'pool', labelKey: 'amenities.filters.pools', Icon: Waves },
  { key: 'gym', labelKey: 'amenities.filters.gyms', Icon: Dumbbell },
  { key: 'workspace', labelKey: 'amenities.filters.workspaces', Icon: Users },
];

export function AmenitiesBook() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<AmenityKind | 'all'>('all');

  const visibleSections = SECTIONS.filter((s) => filter === 'all' || s.key === filter);

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-amber-50/60 via-rose-50/40 to-white dark:from-ink-900 dark:via-ink-900 dark:to-ink-900">
      {/* Header */}
      <header className="flex flex-row items-center gap-3 px-4 py-3 border-b border-white/40">
        <button
          type="button"
          onClick={() => navigate('/services')}
          aria-label={t('amenities.back')}
          className="w-10 h-10 -ms-2 rounded-2xl flex items-center justify-center bg-white/70 dark:bg-ink-700/70 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-sm shadow-ink-900/5 hover:bg-white hover:scale-105 active:scale-95 transition-all duration-300 ease-smooth"
        >
          <ArrowLeft size={20} className="text-ink-700 dark:text-white rtl:rotate-180" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-ink-900 dark:text-white leading-tight truncate">
            {t('amenities.title')}
          </h1>
          <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">
            {t('amenities.subtitle')}
          </p>
        </div>
        <OtelBookingButton compact />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Filter chips */}
        <nav
          role="tablist"
          aria-label={t('amenities.title')}
          className="flex flex-row gap-2 overflow-x-auto no-scrollbar pb-1"
        >
          {FILTERS.map((f) => {
            const isActive = filter === f.key;
            const Icon = f.Icon;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={isActive ? 'true' : 'false'}
                onClick={() => setFilter(f.key)}
                className={[
                  'inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap border backdrop-blur-md transition-all duration-300 ease-smooth',
                  isActive
                    ? 'bg-gradient-to-br from-ink-900 to-ink-800 text-white border-ink-900 shadow-lg shadow-ink-900/25 scale-[1.03]'
                    : 'bg-white/70 dark:bg-ink-700/70 text-ink-700 dark:text-white border-white/50 dark:border-white/10 shadow-sm shadow-ink-900/5 hover:bg-white hover:scale-[1.02]',
                ].join(' ')}
              >
                <Icon size={14} />
                <span>{t(f.labelKey)}</span>
              </button>
            );
          })}
        </nav>

        {/* Sections */}
        {visibleSections.map((section) => (
          <section key={section.key} className="space-y-2.5">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-400 px-1">
              {t(section.labelKey)}
            </h2>
            <div className="space-y-2.5">
              {section.data.map((facility) => (
                <AmenityCard key={facility.id} facility={facility} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function AmenityCard({ facility }: { facility: AmenityFacility }) {
  const { t } = useTranslation();
  const Icon = facility.Icon;
  return (
    <button
      type="button"
      onClick={() => window.alert(`${facility.name}\n\n${t('amenities.bookingComingSoon')}`)}
      className="w-full text-left rounded-3xl border border-white/50 bg-white/70 dark:bg-ink-700/70 backdrop-blur-md p-4 shadow-md shadow-ink-900/5 hover:shadow-lg hover:shadow-ink-900/10 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 ease-smooth"
    >
      <div className="flex flex-row items-start gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-brand-100 to-brand-50 dark:from-brand-700/40 dark:to-brand-700/20 ring-1 ring-white/50 text-brand-700 dark:text-brand-100 flex-shrink-0">
          <Icon size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-row items-start justify-between gap-2 mb-0.5">
            <p className="text-sm font-bold text-ink-900 dark:text-white truncate">
              {facility.name}
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 tabular-nums whitespace-nowrap">
              <Star size={11} className="fill-amber-500 text-amber-500" />
              {facility.rating.toFixed(1)}
            </span>
          </div>
          <p className="text-[11px] text-ink-500 dark:text-ink-100 line-clamp-2 mb-1.5">
            {facility.blurb}
          </p>
          <div className="flex flex-row items-center flex-wrap gap-x-3 gap-y-1 text-[10px] text-ink-500">
            <span className="inline-flex items-center gap-1">
              <CalendarClock size={11} className="text-emerald-600" />
              <span className="font-semibold text-emerald-700">{facility.availability}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} />
              <span>{facility.distance}</span>
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
