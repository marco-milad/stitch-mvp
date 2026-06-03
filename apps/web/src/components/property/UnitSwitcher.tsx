import { Building2, Check, HardHat, Home as HomeIcon, X, type LucideIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { selectMyPrimaryUnit } from '@/lib/residentApi';
import { isNetworkError } from '@/lib/residentApiFallbacks';
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
    // Local store update is synchronous + closes the sheet so the UI
    // feels instant. Backend sync is fire-and-forget — a refused or
    // timed-out POST shouldn't block the user.
    setCurrent(id);
    onClose();
    const property = properties.find((p) => p.id === id);
    if (!property) return;
    void selectMyPrimaryUnit({
      name: property.unitName,
      project: property.compoundName,
      unit_type: property.unitType,
      area_sqm: property.areaM2,
      bedrooms: property.bedrooms,
      role: property.ownership,
    }).catch((err: unknown) => {
      if (isNetworkError(err)) {
        // Backend unreachable (offline dev, Railway cold start) — local
        // store is already updated, so the resident continues to see
        // their selection. Next ticket POST will fall back to "—" until
        // they re-pick after the backend's back.
        console.warn('[UnitSwitcher] backend unreachable; selection saved locally only.', err);
        return;
      }
      console.error('[UnitSwitcher] /me/units/select failed:', err);
    });
  };

  return (
    <>
      {/* Backdrop — constrained to the MobileShell column so the surrounding
          desktop gutters stay clean. */}
      <button
        type="button"
        aria-label={t('properties.switcher.close')}
        aria-hidden={open ? undefined : true}
        tabIndex={-1}
        onClick={onClose}
        className={[
          'fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-ink-950/45 transition-opacity duration-base ease-smooth',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Sheet — sand-50 surface, brand curve hierarchy (rounded-2xl on the
          sheet panel itself = 32px under the new tokens), soft shadow. */}
      <div
        role="dialog"
        aria-label={t('properties.switcher.title')}
        aria-hidden={open ? undefined : true}
        className={[
          'fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50',
          'bg-sand-50 dark:bg-ink-900 rounded-t-2xl border-t border-sand-200 dark:border-ink-700 shadow-xl',
          'transition-transform duration-base ease-smooth',
          open ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        {/* Grabber */}
        <div className="flex justify-center pt-2 pb-1">
          <span className="w-10 h-1 rounded-full bg-sand-200 dark:bg-ink-700" />
        </div>

        {/* Header */}
        <div className="flex flex-row items-center justify-between px-4 pt-2 pb-3">
          <h2 className="text-heading-lg text-ink-900 dark:text-white">
            {t('properties.switcher.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('properties.switcher.close')}
            className="-me-2 p-2 rounded-md hover:bg-sand-100 dark:hover:bg-ink-700 text-ink-500 transition-colors duration-fast ease-smooth"
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
      aria-pressed={active || undefined}
      className={[
        // Rule 2 (curve hierarchy): chip-tier cards land on rounded-2xl.
        // Rule 4 (soft shadow): subtle two-layer shadow at rest, slight lift on hover.
        'w-full flex flex-row items-start gap-3 p-3 rounded-2xl mb-2 text-start border transition-all duration-fast ease-smooth shadow-sm',
        active
          ? // Rule 3 (dark CTAs sacred): selected state mirrors the primary
            // dark pill — ink-950 surface with white type so the picked unit
            // reads as the "current action".
            'bg-ink-950 dark:bg-ink-950 border-ink-950 text-white shadow-md'
          : 'bg-white dark:bg-ink-700 border-sand-200 dark:border-ink-700 hover:border-ink-700 hover:shadow-md',
      ].join(' ')}
    >
      <div
        className={[
          // Inner icon tile sits one tier below the card per curve hierarchy.
          'w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 transition-colors duration-fast ease-smooth',
          active
            ? 'bg-white/15 text-white'
            : 'bg-sand-100 dark:bg-ink-900 text-ink-500 dark:text-ink-100',
        ].join(' ')}
      >
        <Icon size={20} />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={[
            'text-body-md font-bold truncate',
            active ? 'text-white' : 'text-ink-900 dark:text-white',
          ].join(' ')}
        >
          {property.unitName}
        </p>
        <p
          className={[
            'text-label-sm truncate normal-case tracking-normal font-normal',
            active ? 'text-white/75' : 'text-ink-500 dark:text-ink-100',
          ].join(' ')}
        >
          {property.compoundName}
        </p>
        <p
          className={[
            'mt-1 text-label-sm normal-case tracking-normal font-normal',
            active ? 'text-white/70' : 'text-ink-500 dark:text-ink-100',
          ].join(' ')}
        >
          {t(`properties.unitTypes.${property.unitType}`)} ·{' '}
          {t('properties.bedrooms', { count: property.bedrooms })} · {property.areaM2} m²
        </p>
        <p
          className={[
            'mt-0.5 text-label-sm uppercase',
            active ? 'text-accent-300' : 'text-ink-300',
          ].join(' ')}
        >
          {t(`properties.ownership.${property.ownership}`)}
        </p>
      </div>

      {/* Right-side indicator pills — fully rounded per chip convention. */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {active && (
          <span className="inline-flex items-center gap-1 bg-accent-300 text-ink-950 text-label-sm font-bold px-2 py-0.5 rounded-full">
            <Check size={10} /> {t('properties.switcher.current')}
          </span>
        )}
        {underConstruction && (
          <span
            className={[
              'inline-flex items-center gap-1 text-label-sm font-bold px-2 py-0.5 rounded-full',
              active ? 'bg-white/15 text-white' : 'bg-accent-50 text-accent-700',
            ].join(' ')}
          >
            <HardHat size={10} /> {t('properties.handover.eta', { date: property.handoverDate })}
          </span>
        )}
      </div>
    </button>
  );
}
