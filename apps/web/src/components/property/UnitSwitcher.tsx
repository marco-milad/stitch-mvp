import { Building2, Check, HardHat, Home as HomeIcon, X, type LucideIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import type { Property, UnitType } from '@/lib/schemas/property';
import { usePropertyStore } from '@/stores/propertyStore';

const UNIT_TYPE_ICON: Record<UnitType, LucideIcon> = {
  villa: HomeIcon,
  townhouse: HomeIcon,
  apartment: Building2,
  studio: Building2,
};

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Bottom sheet listing all owned/occupied properties for the current user.
 * Mounted permanently at the Home tab — visibility is driven by the `open`
 * prop so we get a clean slide-up enter and slide-down exit. Sheet is
 * constrained to the MobileShell column width on desktop.
 */
export function UnitSwitcher({ open, onClose }: Props) {
  const { t } = useTranslation();
  const properties = usePropertyStore((s) => s.properties);
  const currentId = usePropertyStore((s) => s.currentPropertyId);
  const setCurrent = usePropertyStore((s) => s.setCurrentProperty);

  // ESC closes the sheet — standard expectation for overlays.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const pick = (id: string) => {
    setCurrent(id);
    onClose();
  };

  return (
    <>
      {/* Backdrop — constrained to the MobileShell column so the surrounding
          desktop gutters stay clean. */}
      <button
        type="button"
        aria-hidden={!open}
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
        aria-label={t('properties.switcher.title')}
        aria-hidden={!open}
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

        {/* Header */}
        <div className="flex flex-row items-center justify-between px-4 pt-2 pb-3">
          <h2 className="text-base font-bold text-ink-900 dark:text-white">
            {t('properties.switcher.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('properties.switcher.close')}
            className="-me-2 p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* List */}
        <div className="px-3 pb-6 max-h-[60vh] overflow-y-auto">
          {properties.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              active={p.id === currentId}
              onClick={() => pick(p.id)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────

function PropertyCard({
  property,
  active,
  onClick,
}: {
  property: Property;
  active: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const Icon = UNIT_TYPE_ICON[property.unitType];
  const underConstruction = property.handoverStatus === 'under-construction';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active ? 'true' : 'false'}
      className={[
        'w-full flex flex-row items-start gap-3 p-3 rounded-2xl mb-2 text-start border transition-colors',
        active
          ? 'bg-brand-50 dark:bg-brand-700/30 border-brand-500'
          : 'bg-white dark:bg-ink-700 border-ink-100 dark:border-ink-700 hover:border-brand-400',
      ].join(' ')}
    >
      <div
        className={[
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          active
            ? 'bg-brand-500 text-white'
            : 'bg-ink-100 dark:bg-ink-900 text-ink-500 dark:text-ink-100',
        ].join(' ')}
      >
        <Icon size={20} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink-900 dark:text-white truncate">
          {property.unitName}
        </p>
        <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">
          {property.compoundName}
        </p>
        <p className="mt-1 text-[11px] text-ink-500 dark:text-ink-100">
          {t(`properties.unitTypes.${property.unitType}`)} ·{' '}
          {t('properties.bedrooms', { count: property.bedrooms })} · {property.areaM2} m²
        </p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-ink-400">
          {t(`properties.ownership.${property.ownership}`)}
        </p>
      </div>

      {/* Right-side indicator */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {active && (
          <span className="inline-flex items-center gap-1 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            <Check size={10} /> {t('properties.switcher.current')}
          </span>
        )}
        {underConstruction && (
          <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <HardHat size={10} /> {t('properties.handover.eta', { date: property.handoverDate })}
          </span>
        )}
      </div>
    </button>
  );
}
