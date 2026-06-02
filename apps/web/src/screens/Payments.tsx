// /payments — premium billing dashboard.
//
// Surfaces the resident's financial state in three tiers:
//   1. Overdue banner — fires when duePaymentsStore.count > 0. This is
//      the same signal that auto-suspends features (Invite Guest, etc.)
//      so the resident sees one coherent story: "you owe → these
//      features are off → here's the invoice that explains why".
//   2. Installment plan — progress bar over X paid of N installments.
//      Mocked as a flat amortisation; real numbers land in Week 3.
//   3. Invoice history — every invoice, with explicit status pills
//      (paid / due / overdue).
//
// The "Pay all due" CTA decrements the duePayments count to zero. That
// flips the Invite Guest CTA back from suspended → enabled. End-to-end
// demonstration of the operational business rule.

import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Receipt,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { formatNumber } from '@/lib/format';
import { useDuePaymentsStore, useHasOverdueBalance } from '@/stores/duePaymentsStore';

// ─── Mock data ─────────────────────────────────────────────────────────────
// Replaced in Week 3 by `GET /api/v1/me/invoices`.

type InvoiceStatus = 'paid' | 'due' | 'overdue';

interface Invoice {
  id: string;
  /** Bill descriptor — "Maintenance Q3 2026", "Pool fee Aug 2026". */
  label: string;
  amountEgp: number;
  /** ISO date string. */
  dueDate: string;
  status: InvoiceStatus;
  /** Optional, only set when paid. */
  paidAtIso?: string;
}

const INVOICES: Invoice[] = [
  {
    id: 'inv-2026-q4-maint',
    label: 'Maintenance Q4 2026',
    amountEgp: 3_200,
    dueDate: '2026-06-15',
    status: 'overdue',
  },
  {
    id: 'inv-2026-08-pool',
    label: 'Pool & gym Aug',
    amountEgp: 450,
    dueDate: '2026-06-30',
    status: 'due',
  },
  {
    id: 'inv-2026-q3-maint',
    label: 'Maintenance Q3 2026',
    amountEgp: 3_200,
    dueDate: '2026-03-15',
    status: 'paid',
    paidAtIso: '2026-03-12T09:14:00Z',
  },
  {
    id: 'inv-2026-q2-maint',
    label: 'Maintenance Q2 2026',
    amountEgp: 3_100,
    dueDate: '2025-12-15',
    status: 'paid',
    paidAtIso: '2025-12-11T15:33:00Z',
  },
  {
    id: 'inv-2026-q1-maint',
    label: 'Maintenance Q1 2026',
    amountEgp: 3_100,
    dueDate: '2025-09-15',
    status: 'paid',
    paidAtIso: '2025-09-09T11:02:00Z',
  },
];

// Mock installment plan — total / paid count / next due.
const INSTALLMENT_PLAN = {
  totalInstallments: 12,
  paidInstallments: 9,
  perInstallmentEgp: 3_200,
  nextDueIso: '2026-06-15',
};

// ─── Screen ────────────────────────────────────────────────────────────────

export function Payments() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dueCount = useDuePaymentsStore((s) => s.count);
  const hasOverdue = useHasOverdueBalance();
  const setCount = useDuePaymentsStore((s) => s.setCount);

  const totalsByStatus = useMemo(() => {
    const acc: Record<InvoiceStatus, number> = { paid: 0, due: 0, overdue: 0 };
    for (const inv of INVOICES) acc[inv.status] += inv.amountEgp;
    return acc;
  }, []);

  const outstanding = totalsByStatus.overdue + totalsByStatus.due;

  const handlePayAll = () => {
    // Demo wire: zero out the global suspension count. The Invite Guest
    // CTA on Home + the Invite quick action on QR un-suspend the moment
    // this runs (live store subscription).
    setCount(0);
    window.alert(t('payments.payAll.success'));
  };

  const progressPct = Math.round(
    (INSTALLMENT_PLAN.paidInstallments / INSTALLMENT_PLAN.totalInstallments) * 100,
  );

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-amber-50/60 via-rose-50/40 to-white dark:from-ink-900 dark:via-ink-900 dark:to-ink-900">
      {/* Header */}
      <header className="flex flex-row items-center gap-3 px-4 py-3 border-b border-white/40">
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label={t('payments.back')}
          className="w-10 h-10 -ms-2 rounded-2xl flex items-center justify-center bg-white/70 dark:bg-ink-700/70 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-sm shadow-ink-900/5 hover:bg-white hover:scale-105 active:scale-95 transition-all duration-300 ease-smooth"
        >
          <ArrowLeft size={20} className="text-ink-700 dark:text-white rtl:rotate-180" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-ink-900 dark:text-white leading-tight truncate">
            {t('payments.title')}
          </h1>
          <p className="text-[11px] text-ink-500 dark:text-ink-100 truncate">
            {t('payments.subtitle')}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Overdue banner — only when count > 0. Mirrors the operational
            suspension rule that disables the Invite Guest CTA. */}
        {hasOverdue && (
          <div
            role="alert"
            className="rounded-3xl border border-red-200/70 bg-gradient-to-br from-red-50/90 via-red-50/70 to-rose-50/60 backdrop-blur-md p-4 shadow-lg shadow-red-500/15"
          >
            <div className="flex flex-row items-start gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-md shadow-red-500/30 ring-1 ring-white/40 flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-red-800 leading-tight">
                  {t('payments.overdue.title', { count: dueCount })}
                </p>
                <p className="text-[11px] text-red-700 mt-1 leading-relaxed">
                  {t('payments.overdue.body')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Outstanding hero card */}
        <section className="rounded-3xl border border-white/60 bg-gradient-to-br from-brand-50/80 via-white/60 to-amber-50/40 backdrop-blur-md p-5 shadow-lg shadow-brand-500/10">
          <div className="flex flex-row items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-ink-900 to-ink-800 text-white shadow-md shadow-ink-900/30 ring-1 ring-white/40 flex-shrink-0">
              <Wallet size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-500">
                {t('payments.outstanding.label')}
              </p>
              <p className="text-3xl font-extrabold text-ink-900 dark:text-white leading-tight tabular-nums">
                EGP {formatNumber(outstanding, i18n.language)}
              </p>
              <p className="text-[11px] text-ink-500 dark:text-ink-100 mt-1">
                {t('payments.outstanding.breakdown', {
                  overdue: formatNumber(totalsByStatus.overdue, i18n.language),
                  due: formatNumber(totalsByStatus.due, i18n.language),
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePayAll}
            disabled={outstanding === 0}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 bg-gradient-to-br from-ink-900 to-ink-800 text-white text-sm font-semibold shadow-lg shadow-ink-900/20 hover:shadow-xl hover:shadow-ink-900/30 hover:scale-[1.01] active:scale-[0.99] disabled:from-ink-300 disabled:to-ink-300 disabled:shadow-none disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 ease-smooth"
          >
            <CreditCard size={16} />
            <span>{t('payments.payAll.cta')}</span>
          </button>
        </section>

        {/* Installment plan */}
        <section className="rounded-3xl border border-white/60 bg-white/70 dark:bg-ink-700/70 backdrop-blur-md p-5 shadow-md shadow-ink-900/5">
          <div className="flex flex-row items-baseline justify-between mb-3">
            <h2 className="text-sm font-bold text-ink-900 dark:text-white">
              {t('payments.installments.title')}
            </h2>
            <span className="text-[11px] font-bold text-ink-500 tabular-nums">
              {INSTALLMENT_PLAN.paidInstallments} / {INSTALLMENT_PLAN.totalInstallments}
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden bg-ink-100 dark:bg-ink-900 mb-3">
            <div
              className="h-full rounded-full transition-all duration-700 ease-smooth"
              style={{
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg, #06B6D4, #7C3AED)',
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-1">
            <Stat
              label={t('payments.installments.next')}
              value={formatIsoDate(INSTALLMENT_PLAN.nextDueIso, i18n.language)}
              Icon={CalendarClock}
            />
            <Stat
              label={t('payments.installments.perInstallment')}
              value={`EGP ${formatNumber(INSTALLMENT_PLAN.perInstallmentEgp, i18n.language)}`}
              Icon={Receipt}
            />
          </div>
        </section>

        {/* Invoice history */}
        <section className="space-y-2.5">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-400 px-1">
            {t('payments.history.title')}
          </h2>
          <div className="space-y-2">
            {INVOICES.map((inv) => (
              <InvoiceRow key={inv.id} invoice={inv} locale={i18n.language} />
            ))}
          </div>
        </section>

        <p className="text-[10px] text-center text-ink-400 pb-2">{t('payments.sapNote')}</p>
      </div>
    </div>
  );
}

// ─── Pieces ────────────────────────────────────────────────────────────────

function Stat({ label, value, Icon }: { label: string; value: string; Icon: LucideIcon }) {
  return (
    <div className="rounded-2xl bg-white/70 dark:bg-ink-900/40 backdrop-blur-sm border border-white/50 p-3">
      <div className="flex flex-row items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-500 mb-1">
        <Icon size={11} />
        <span>{label}</span>
      </div>
      <p className="text-sm font-bold text-ink-900 dark:text-white tabular-nums">{value}</p>
    </div>
  );
}

function InvoiceRow({ invoice, locale }: { invoice: Invoice; locale: string }) {
  const { t } = useTranslation();
  const status = STATUS_STYLES[invoice.status];
  return (
    <div className="flex flex-row items-center gap-3 rounded-3xl border border-white/50 bg-white/70 dark:bg-ink-700/70 backdrop-blur-md p-4 shadow-sm shadow-ink-900/5 hover:shadow-md hover:shadow-ink-900/10 transition-all duration-300 ease-smooth">
      <div
        className={`w-10 h-10 rounded-2xl flex items-center justify-center ring-1 ring-white/50 flex-shrink-0 ${status.iconWrap}`}
      >
        <status.Icon size={18} className={status.iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-row items-baseline justify-between gap-2">
          <p className="text-sm font-bold text-ink-900 dark:text-white truncate">{invoice.label}</p>
          <p className="text-sm font-bold text-ink-900 dark:text-white tabular-nums whitespace-nowrap">
            EGP {formatNumber(invoice.amountEgp, locale)}
          </p>
        </div>
        <div className="flex flex-row items-center gap-2 mt-0.5">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-2xl text-[10px] font-bold border ${status.chip}`}
          >
            {t(status.labelKey)}
          </span>
          <span className="text-[10px] text-ink-500">
            {invoice.status === 'paid' && invoice.paidAtIso
              ? t('payments.history.paidOn', { date: formatIsoDate(invoice.paidAtIso, locale) })
              : t('payments.history.dueOn', { date: formatIsoDate(invoice.dueDate, locale) })}
          </span>
        </div>
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<
  InvoiceStatus,
  {
    Icon: LucideIcon;
    iconWrap: string;
    iconColor: string;
    chip: string;
    labelKey: string;
  }
> = {
  paid: {
    Icon: CheckCircle2,
    iconWrap: 'bg-emerald-100/80',
    iconColor: 'text-emerald-700',
    chip: 'bg-emerald-100/80 border-emerald-200/70 text-emerald-700',
    labelKey: 'payments.history.statusPaid',
  },
  due: {
    Icon: CalendarClock,
    iconWrap: 'bg-amber-100/80',
    iconColor: 'text-amber-700',
    chip: 'bg-amber-100/80 border-amber-200/70 text-amber-800',
    labelKey: 'payments.history.statusDue',
  },
  overdue: {
    Icon: AlertTriangle,
    iconWrap: 'bg-red-100/80',
    iconColor: 'text-red-700',
    chip: 'bg-red-100/80 border-red-200/70 text-red-700',
    labelKey: 'payments.history.statusOverdue',
  },
};

// ─── Date formatting helper ────────────────────────────────────────────────

function formatIsoDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}
