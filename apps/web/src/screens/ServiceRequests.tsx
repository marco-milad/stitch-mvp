import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { MyMaintenanceTickets } from '@/components/requests/MyMaintenanceTickets';
import { formatFullDate, fromDateIso } from '@/lib/dates';
import { SERVICE_TILES } from '@/lib/mock/services';
import { getProviderById, offeringLabelKey } from '@/lib/mock/serviceProviders';
import {
  isActiveStatus,
  type RequestStatus,
  type ServiceRequest,
} from '@/lib/schemas/serviceRequest';
import { useServiceRequestsStore } from '@/stores/serviceRequestsStore';

const STATUS_TONE: Record<RequestStatus, { bg: string; fg: string }> = {
  pending: { bg: '#FEF3C7', fg: '#92400E' },
  confirmed: { bg: '#DBEAFE', fg: '#1D4ED8' },
  'in-progress': { bg: '#EDE9FE', fg: '#6D28D9' },
  completed: { bg: '#D1FAE5', fg: '#047857' },
  cancelled: { bg: '#FEE2E2', fg: '#B91C1C' },
};

export function ServiceRequests() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const requests = useServiceRequestsStore((s) => s.requests);
  const cancelRequest = useServiceRequestsStore((s) => s.cancelRequest);

  const { active, past } = useMemo(() => {
    const a: ServiceRequest[] = [];
    const p: ServiceRequest[] = [];
    for (const r of requests) (isActiveStatus(r.status) ? a : p).push(r);
    return { active: a, past: p };
  }, [requests]);

  return (
    <>
      <div className="bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-700">
        <div className="flex flex-row items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/services')}
            aria-label="Back"
            className="p-2 -ms-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700"
          >
            <ArrowLeft size={22} className="text-ink-700 dark:text-white rtl:rotate-180" />
          </button>
          <h1 className="text-base font-bold text-ink-900 dark:text-white truncate">
            {t('services.requests.title')}
          </h1>
        </div>
      </div>

      <div className="p-4">
        {/* Maintenance tickets (live from /api/v1/me/requests) sit above
            the existing service-booking list. */}
        <MyMaintenanceTickets />

        {requests.length === 0 ? null : (
          <>
            {active.length > 0 && (
              <Section
                title={t('services.requests.activeTitle')}
                requests={active}
                onCancel={cancelRequest}
              />
            )}
            {past.length > 0 && (
              <Section title={t('services.requests.pastTitle')} requests={past} />
            )}
          </>
        )}
      </div>
    </>
  );
}

function Section({
  title,
  requests,
  onCancel,
}: {
  title: string;
  requests: ServiceRequest[];
  onCancel?: (id: string) => void;
}) {
  return (
    <section className="mb-5">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-400 mb-2">{title}</h3>
      <div className="space-y-2">
        {requests.map((r) => (
          <RequestCard key={r.id} request={r} onCancel={onCancel} />
        ))}
      </div>
    </section>
  );
}

function RequestCard({
  request,
  onCancel,
}: {
  request: ServiceRequest;
  onCancel?: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const tile = SERVICE_TILES.find((tl) => tl.id === request.tileId);
  const provider = getProviderById(request.providerId);
  const tone = STATUS_TONE[request.status];
  const dateObj = fromDateIso(request.dateIso);
  const dateLabel = dateObj ? formatFullDate(dateObj, i18n.language) : request.dateIso;

  return (
    <div className="bg-white dark:bg-ink-700 rounded-2xl p-3 border border-ink-100 dark:border-ink-700">
      <div className="flex flex-row items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink-900 dark:text-white truncate">
            {provider?.name ?? request.providerId}
          </p>
          <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">
            {tile ? `${tile.name} · ` : ''}
            {t(offeringLabelKey(request.tileId, request.offeringKey))}
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-ink-700 dark:text-ink-100">
            <CalendarIcon size={11} />
            {t('services.requests.scheduledFor', {
              date: dateLabel,
              time: request.timeSlot,
            })}
          </p>
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: tone.bg, color: tone.fg }}
        >
          {t(`services.requests.status.${request.status}`)}
        </span>
      </div>
      {onCancel && (
        <button
          type="button"
          onClick={() => onCancel(request.id)}
          className="mt-3 text-[11px] font-semibold text-red-600 dark:text-red-400"
        >
          {t('services.requests.cancel')}
        </button>
      )}
    </div>
  );
}
