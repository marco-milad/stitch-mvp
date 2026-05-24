// Thin wrapper that hosts the same live `VisitorPassSection` +
// `ParkingSection` as `/home/parking`. The legacy local-state implementation
// (parkingStore + lib/mock/parking + lib/schemas/visitorPass) was retired
// once HomeParking went live — keeping the `/services/parking` route
// avoids breaking existing bookmarks / deep links.

import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { ParkingSection, VisitorPassSection } from '@/screens/HomeParking';

type Tab = 'visitor' | 'parking';

export function ServiceParking() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('parking');

  return (
    <div className="flex flex-col min-h-full bg-ink-50 dark:bg-ink-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-700 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/services')}
          aria-label={t('homeParking.back')}
          className="p-2 -ms-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700"
        >
          <ArrowLeft size={22} className="text-ink-700 dark:text-white rtl:rotate-180" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-ink-900 dark:text-white leading-tight truncate">
            {t('homeParking.title')}
          </h1>
          <p className="text-[11px] text-ink-500 dark:text-ink-100 leading-tight truncate">
            {t('homeParking.subtitle')}
          </p>
        </div>
      </header>

      <div className="px-3 py-3">
        <div className="inline-flex gap-1 p-1 bg-ink-100 dark:bg-ink-700 rounded-lg">
          {(['parking', 'visitor'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={[
                'px-4 py-1.5 rounded-md text-xs font-semibold',
                tab === k
                  ? 'bg-white dark:bg-ink-900 text-ink-900 dark:text-white shadow-sm'
                  : 'text-ink-500 dark:text-ink-100',
              ].join(' ')}
            >
              {t(`homeParking.tabs.${k}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-3 pb-12">
        {tab === 'visitor' ? <VisitorPassSection /> : <ParkingSection />}
      </div>
    </div>
  );
}
