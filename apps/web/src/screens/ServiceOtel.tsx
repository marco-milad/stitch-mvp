import { ArrowLeft, BedDouble, MapPin, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { OtelBookingButton } from '@/components/booking/OtelBookingButton';
import { TopBar } from '@/components/TopBar';

interface PartnerDeal {
  id: string;
  name: string;
  location: string;
  rating: number;
  blurb: string;
  perk: string;
}

// Placeholder partner roster — Week-N rep will swap this for a real
// `GET /me/otel/partners` list. Static now so the screen is shippable
// without backend work and the resident sees something concrete instead
// of an empty info card.
const PARTNER_DEALS: PartnerDeal[] = [
  {
    id: 'sahel-cove',
    name: 'Sahel Cove Resort',
    location: 'North Coast · 2.5 h drive',
    rating: 4.8,
    blurb: 'Beachfront cabanas, private pool access, sunset dinners.',
    perk: '15% resident discount on weeknights',
  },
  {
    id: 'palm-hills-marina',
    name: 'Palm Hills Marina',
    location: 'Marina · 3 h drive',
    rating: 4.7,
    blurb: 'Lagoon-side family suites, kids club, watersports included.',
    perk: 'Complimentary breakfast for two',
  },
  {
    id: 'el-gouna-bay',
    name: 'El Gouna Bay Hotel',
    location: 'Red Sea · short flight',
    rating: 4.9,
    blurb: 'Diving, spa, fine-dining — adults-only wing on request.',
    perk: '4-night stay, pay for 3',
  },
];

export function ServiceOtel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <>
      <TopBar title={t('otel.title')} />
      <div className="px-4 pt-2 pb-1">
        <button
          type="button"
          onClick={() => navigate('/services')}
          aria-label={t('otel.back')}
          className="inline-flex items-center gap-1 text-label-sm normal-case tracking-normal font-bold text-ink-500 dark:text-ink-100 hover:text-ink-950"
        >
          <ArrowLeft size={14} className="rtl:rotate-180" />
          {t('otel.back')}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Hero — sacred dark CTA. The OtelBookingButton itself opens
            the partner property in a fresh tab so the resident can return
            to the picker without losing context. */}
        <div className="rounded-3xl bg-ink-950 dark:bg-white text-white dark:text-ink-950 p-5 shadow-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 dark:bg-ink-950/10 flex items-center justify-center">
              <BedDouble size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-display-md leading-tight">{t('otel.hero.title')}</p>
              <p className="text-label-sm normal-case tracking-normal font-normal opacity-70">
                {t('otel.hero.subtitle')}
              </p>
            </div>
          </div>
          <OtelBookingButton className="w-full justify-center" />
        </div>

        {/* Partner deals */}
        <h3 className="text-heading-lg text-ink-950 dark:text-white pt-2">
          {t('otel.deals.title')}
        </h3>
        <div className="space-y-2">
          {PARTNER_DEALS.map((d) => (
            <article
              key={d.id}
              className="bg-white dark:bg-ink-700 rounded-3xl p-4 border border-sand-200/60 dark:border-ink-700 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-sand-100 dark:bg-ink-900 flex items-center justify-center text-ink-500 flex-shrink-0">
                  <BedDouble size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-body-md font-bold text-ink-950 dark:text-white truncate">
                      {d.name}
                    </p>
                    <span className="inline-flex items-center gap-1 text-label-sm normal-case tracking-normal font-bold text-accent-700 dark:text-accent-300 tabular-nums">
                      <Star size={11} className="fill-accent-500 text-accent-500" />
                      {d.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="inline-flex items-center gap-1 text-label-sm normal-case tracking-normal font-normal text-ink-500 dark:text-ink-100">
                    <MapPin size={11} />
                    {d.location}
                  </p>
                  <p className="text-label-sm normal-case tracking-normal font-normal text-ink-700 dark:text-ink-100 mt-1.5">
                    {d.blurb}
                  </p>
                  <p className="text-label-sm normal-case tracking-normal font-bold text-accent-700 dark:text-accent-300 mt-2">
                    {d.perk}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
