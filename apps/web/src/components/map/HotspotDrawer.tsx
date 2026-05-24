import { BookOpen, Info, Navigation, Phone, X, type LucideIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { HOTSPOT_TONE, type MapHotspot } from '@/lib/mock/compoundMap';

interface Props {
  hotspot: MapHotspot | null;
  onClose: () => void;
}

/**
 * Slide-up sheet showing a hotspot's name, sub, and quick actions.
 * Constrained to the MobileShell column on desktop via the same
 * `fixed left-1/2 -translate-x-1/2 max-w-md` pattern as UnitSwitcher.
 * Rendered permanently — visibility is driven by `hotspot != null` so
 * the slide animation runs both ways without unmount delay.
 */
export function HotspotDrawer({ hotspot, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const open = hotspot != null;

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const tone = hotspot ? HOTSPOT_TONE[hotspot.category] : null;
  const Icon = hotspot?.icon;

  const handleDirections = () =>
    window.alert(t('services.compoundMap.actions.directionsComingSoon'));
  const handleLearnMore = () => window.alert(t('services.compoundMap.actions.learnMoreComingSoon'));
  const handleCall = () => {
    if (!hotspot?.actions.callTel) return;
    window.location.href = `tel:${hotspot.actions.callTel}`;
  };
  const handleBook = () => {
    if (!hotspot?.actions.bookHref) return;
    navigate(hotspot.actions.bookHref);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label={t('services.compoundMap.close')}
        aria-hidden={open ? 'false' : 'true'}
        tabIndex={-1}
        onClick={onClose}
        className={[
          'fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-black/50 transition-opacity',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-label={t('services.compoundMap.drawerTitle')}
        aria-hidden={open ? 'false' : 'true'}
        className={[
          'fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50',
          'bg-white dark:bg-ink-900 rounded-t-3xl border-t border-ink-100 dark:border-ink-700 shadow-2xl',
          'transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        {/* Grabber */}
        <div className="flex justify-center pt-2 pb-1">
          <span className="w-10 h-1 rounded-full bg-ink-100 dark:bg-ink-700" />
        </div>

        {/* Body — only render contents when we have a hotspot, but keep
             the container mounted so the slide animation runs both ways */}
        {hotspot && tone && Icon && (
          <div className="px-4 pt-2 pb-5">
            {/* Close + header */}
            <div className="flex flex-row items-start gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-white"
                style={{ backgroundColor: tone.dot }}
              >
                <Icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                  style={{ color: tone.ring }}
                >
                  {t(`services.compoundMap.filters.${hotspot.category}`)}
                </p>
                <p className="text-base font-bold text-ink-900 dark:text-white leading-tight">
                  {t(hotspot.nameKey)}
                </p>
                <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-100">{t(hotspot.subKey)}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('services.compoundMap.close')}
                className="-me-2 -mt-1 p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Action buttons row */}
            <div className="mt-4 flex flex-row gap-2">
              {hotspot.actions.directions && (
                <ActionButton
                  Icon={Navigation}
                  label={t('services.compoundMap.actions.directions')}
                  onClick={handleDirections}
                  primary
                />
              )}
              {hotspot.actions.callTel && (
                <ActionButton
                  Icon={Phone}
                  label={t('services.compoundMap.actions.call')}
                  onClick={handleCall}
                />
              )}
              {hotspot.actions.bookHref && (
                <ActionButton
                  Icon={BookOpen}
                  label={t('services.compoundMap.actions.book')}
                  onClick={handleBook}
                />
              )}
              {hotspot.actions.learnMore && (
                <ActionButton
                  Icon={Info}
                  label={t('services.compoundMap.actions.learnMore')}
                  onClick={handleLearnMore}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ActionButton({
  Icon,
  label,
  onClick,
  primary,
}: {
  Icon: LucideIcon;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 inline-flex flex-col items-center justify-center gap-1 rounded-xl py-3 text-[11px] font-semibold transition-colors',
        primary
          ? 'bg-brand-500 text-white hover:bg-brand-600'
          : 'bg-ink-100 dark:bg-ink-700 text-ink-900 dark:text-white hover:bg-ink-100/80',
      ].join(' ')}
    >
      <Icon size={18} />
      <span className="leading-tight text-center">{label}</span>
    </button>
  );
}
