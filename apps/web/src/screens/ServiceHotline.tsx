import { ArrowLeft, Phone, ShieldCheck, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { TopBar } from '@/components/TopBar';

// Static compound hotline directory. When per-tenant numbers land, swap
// for `GET /me/compound/hotlines`. Tel-links use `tel:` URIs so mobile
// browsers and PWA launchers dial straight from a tap.
const HOTLINES = [
  { key: 'security', icon: ShieldCheck, tel: '+201000000911' },
  { key: 'maintenance', icon: Wrench, tel: '+201000000912' },
] as const;

export function ServiceHotline() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <>
      <TopBar title={t('hotline.title')} />
      <div className="px-4 pt-2 pb-1">
        <button
          type="button"
          onClick={() => navigate('/services')}
          aria-label={t('hotline.back')}
          className="inline-flex items-center gap-1 text-label-sm normal-case tracking-normal font-bold text-ink-500 dark:text-ink-100 hover:text-ink-950"
        >
          <ArrowLeft size={14} className="rtl:rotate-180" />
          {t('hotline.back')}
        </button>
      </div>
      <ul className="p-4 space-y-2">
        {HOTLINES.map(({ key, icon: Icon, tel }) => (
          <li key={key}>
            <a
              href={`tel:${tel}`}
              className="flex items-center gap-3 bg-white dark:bg-ink-700 rounded-3xl p-4 border border-sand-200/60 dark:border-ink-700 shadow-sm hover:shadow-md active:scale-[0.99] transition-all duration-base ease-smooth"
            >
              <div className="w-11 h-11 rounded-2xl bg-ink-950 text-white flex items-center justify-center flex-shrink-0">
                <Icon size={20} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-md font-bold text-ink-950 dark:text-white truncate">
                  {t(`hotline.lines.${key}.label`)}
                </p>
                <p
                  dir="ltr"
                  className="text-label-sm normal-case tracking-normal font-normal text-ink-500 dark:text-ink-100 tabular-nums"
                >
                  {tel}
                </p>
              </div>
              <Phone size={18} className="text-ink-500 flex-shrink-0" />
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
