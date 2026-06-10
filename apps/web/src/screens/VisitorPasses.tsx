// /visitor-passes — resident issues a one-day QR pass for a guest and
// shares it via Web Share / WhatsApp.
//
// Two states swapped with AnimatePresence:
//   1. form    — visitor name + car plate + date of visit
//   2. ticket  — cinema-ticket-shaped card with the QR + share CTA
//
// The form auto-derives validFrom/validTo from the picked date
// (full day window in the resident's local TZ) so the backend gets a
// clean ISO interval without exposing the resident to time math.

import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Car,
  CheckCircle2,
  Copy,
  Loader2,
  QrCode as QrCodeIcon,
  Share2,
  User as UserIcon,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { TopBar } from '@/components/TopBar';
import { InlineNotice, type InlineNoticeData } from '@/components/ui/InlineNotice';
import { createVisitorPass, type VisitorPass } from '@/lib/residentApi';
import { sharePass, type ShareResult } from '@/lib/shareVisitorPass';
import { useUnreadCount } from '@/lib/useNotifications';

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayBounds(dateIso: string): { from: string; to: string } {
  // Resident picks a YYYY-MM-DD; we send 00:00 → 23:59:59 in their
  // local TZ. Backend stores ISO strings as-is, so the security gate
  // sees the same window the resident intended.
  const start = new Date(`${dateIso}T00:00:00`);
  const end = new Date(`${dateIso}T23:59:59`);
  return { from: start.toISOString(), to: end.toISOString() };
}

const CARD_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.42, ease: [0.32, 0.72, 0, 1] },
  },
  exit: {
    opacity: 0,
    y: -16,
    scale: 0.97,
    transition: { duration: 0.24, ease: [0.32, 0.72, 0, 1] },
  },
};

const STAGGER_PARENT: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const STAGGER_ITEM: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] },
  },
};

export function VisitorPasses() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const unreadCount = useUnreadCount();
  const [issuedPass, setIssuedPass] = useState<VisitorPass | null>(null);

  return (
    <>
      <TopBar title={t('visitorPasses.title')} unreadCount={unreadCount} />

      <div className="px-4 py-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-ink-700 dark:text-ink-100 mb-3 hover:underline"
        >
          <ArrowLeft size={14} className="rtl:rotate-180" />
          {t('visitorPasses.back')}
        </button>

        <AnimatePresence mode="wait" initial={false}>
          {issuedPass ? (
            <motion.div
              key="ticket"
              variants={CARD_VARIANTS}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              <TicketCard pass={issuedPass} onIssueAnother={() => setIssuedPass(null)} />
            </motion.div>
          ) : (
            <motion.div
              key="form"
              variants={CARD_VARIANTS}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              <IssueForm onIssued={(pass) => setIssuedPass(pass)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ─── Issue form ──────────────────────────────────────────────────────────

function IssueForm({ onIssued }: { onIssued: (pass: VisitorPass) => void }) {
  const { t } = useTranslation();
  const [visitorName, setVisitorName] = useState('');
  const [carPlate, setCarPlate] = useState('');
  const [date, setDate] = useState(todayIso());
  const [notice, setNotice] = useState<InlineNoticeData | null>(null);

  const mutation = useMutation({
    mutationFn: createVisitorPass,
    onSuccess: (pass) => onIssued(pass),
    onError: (err: Error) => {
      setNotice({
        tone: 'error',
        message: t('visitorPasses.errors.create', { message: err.message }),
      });
    },
  });

  const canSubmit = useMemo(
    () => visitorName.trim().length > 0 && !mutation.isPending,
    [visitorName, mutation.isPending],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setNotice(null);
    const { from, to } = dayBounds(date);
    mutation.mutate({
      visitorName: visitorName.trim(),
      vehicleKind: 'car',
      validFrom: from,
      validTo: to,
      carPlate: carPlate.trim() || undefined,
    });
  };

  return (
    <section>
      <header className="mb-3">
        <h2 className="text-heading-lg text-ink-950 dark:text-white">
          {t('visitorPasses.form.title')}
        </h2>
        <p className="text-[11px] text-ink-500 dark:text-ink-100">
          {t('visitorPasses.form.subtitle')}
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-ink-700 rounded-3xl border border-sand-200/60 dark:border-ink-700 shadow-sm p-4 space-y-3"
      >
        <InlineNotice notice={notice} onDismiss={() => setNotice(null)} />

        <Field label={t('visitorPasses.form.visitor')} Icon={UserIcon}>
          <input
            type="text"
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            placeholder={t('visitorPasses.form.visitorPlaceholder')}
            maxLength={120}
            required
            aria-label={t('visitorPasses.form.visitor')}
            className="w-full px-3 py-2.5 rounded-xl border border-sand-200 dark:border-ink-700 bg-white dark:bg-ink-800 text-sm text-ink-950 dark:text-white focus:outline-none focus:border-ink-400"
          />
        </Field>

        <Field
          label={t('visitorPasses.form.plate')}
          help={t('visitorPasses.form.plateHelp')}
          Icon={Car}
        >
          <input
            type="text"
            value={carPlate}
            onChange={(e) => setCarPlate(e.target.value)}
            placeholder={t('visitorPasses.form.platePlaceholder')}
            maxLength={20}
            dir="ltr"
            aria-label={t('visitorPasses.form.plate')}
            className="w-full px-3 py-2.5 rounded-xl border border-sand-200 dark:border-ink-700 bg-white dark:bg-ink-800 text-sm text-ink-950 dark:text-white tracking-widest uppercase focus:outline-none focus:border-ink-400"
          />
        </Field>

        <Field label={t('visitorPasses.form.date')} Icon={CalendarIcon}>
          <input
            type="date"
            value={date}
            min={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            required
            aria-label={t('visitorPasses.form.date')}
            className="w-full px-3 py-2.5 rounded-xl border border-sand-200 dark:border-ink-700 bg-white dark:bg-ink-800 text-sm text-ink-950 dark:text-white tabular-nums focus:outline-none focus:border-ink-400"
          />
        </Field>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-ink-950 dark:bg-white text-white dark:text-ink-950 py-3.5 text-sm font-bold shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-base ease-smooth disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {t('visitorPasses.form.submitting')}
            </>
          ) : (
            <>
              <QrCodeIcon size={16} />
              {t('visitorPasses.form.submit')}
            </>
          )}
        </button>
      </form>
    </section>
  );
}

function Field({
  label,
  help,
  Icon,
  children,
}: {
  label: string;
  help?: string;
  Icon: typeof UserIcon;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-500">
        <Icon size={11} />
        {label}
      </span>
      {children}
      {help && <span className="text-[10px] text-ink-400">{help}</span>}
    </label>
  );
}

// ─── Cinema ticket card + share ───────────────────────────────────────────

function TicketCard({ pass, onIssueAnother }: { pass: VisitorPass; onIssueAnother: () => void }) {
  const { t, i18n } = useTranslation();
  const [shareNotice, setShareNotice] = useState<InlineNoticeData | null>(null);
  const [sharing, setSharing] = useState(false);

  // Auto-dismiss the share notice after 2.5s.
  useEffect(() => {
    if (!shareNotice) return undefined;
    const id = setTimeout(() => setShareNotice(null), 2500);
    return () => clearTimeout(id);
  }, [shareNotice]);

  const dateLabel = useMemo(() => {
    const date = new Date(pass.validFrom);
    return new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }, [pass.validFrom, i18n.language]);

  const messageBody = useMemo(
    () =>
      t('visitorPasses.share.body', {
        visitor: pass.visitorName,
        host: pass.hostName,
        unit: pass.unit,
        code: pass.code,
        date: dateLabel,
      }),
    [pass, dateLabel, t],
  );

  const onShareClick = async () => {
    if (sharing) return;
    setSharing(true);
    setShareNotice(null);
    const result: ShareResult = await sharePass({
      pass,
      copy: { title: t('visitorPasses.share.title'), message: messageBody },
    });
    setSharing(false);
    if (result === 'cancelled') return;
    if (result === 'native') {
      setShareNotice({ tone: 'success', message: t('visitorPasses.share.successNative') });
    } else if (result === 'whatsapp') {
      setShareNotice({ tone: 'success', message: t('visitorPasses.share.successWhatsapp') });
    } else if (result === 'copied') {
      setShareNotice({ tone: 'info', message: t('visitorPasses.share.successCopied') });
    } else {
      setShareNotice({ tone: 'error', message: t('visitorPasses.share.unsupported') });
    }
  };

  const onCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(pass.code);
      setShareNotice({ tone: 'success', message: t('visitorPasses.share.codeCopied') });
    } catch {
      setShareNotice({ tone: 'error', message: t('visitorPasses.share.codeCopyFail') });
    }
  };

  return (
    <motion.section variants={STAGGER_PARENT} initial="hidden" animate="show">
      <motion.header variants={STAGGER_ITEM} className="mb-3 inline-flex items-center gap-2">
        <CheckCircle2 size={18} className="text-emerald-600" />
        <h2 className="text-heading-lg text-ink-950 dark:text-white">
          {t('visitorPasses.ticket.issued')}
        </h2>
      </motion.header>

      {/* Cinema-ticket card — dashed border + the two notches (perforation
          cues) flanking the divider. Reuses sand-50 surface inside so
          the QR sits on a calm cream backdrop instead of stark white. */}
      <motion.article
        variants={STAGGER_ITEM}
        className="relative bg-white dark:bg-ink-700 border-2 border-dashed border-sand-300 dark:border-ink-700 rounded-3xl shadow-md overflow-hidden"
      >
        {/* Top stub — visitor + plate + day */}
        <div className="px-5 pt-5 pb-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-500">
            {t('visitorPasses.ticket.label')}
          </p>
          <p className="text-2xl font-extrabold text-ink-950 dark:text-white leading-tight truncate">
            {pass.visitorName}
          </p>
          <div className="flex flex-row items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sand-100 text-ink-700 text-[11px] font-semibold">
              <CalendarIcon size={11} />
              <span className="tabular-nums">{dateLabel}</span>
            </span>
            {pass.carPlate && (
              <span
                dir="ltr"
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sand-100 text-ink-700 text-[11px] font-semibold tracking-widest uppercase tabular-nums"
              >
                <Car size={11} />
                {pass.carPlate}
              </span>
            )}
          </div>
        </div>

        {/* Perforation — the two side notches + a dashed divider. The
            notches use negative-positioned circles in the page bg color
            (sand-50) to give the impression of a tear-off ticket. */}
        <div className="relative">
          <div
            aria-hidden
            className="absolute top-1/2 -translate-y-1/2 -start-3 w-6 h-6 rounded-full bg-sand-50 dark:bg-ink-900"
          />
          <div
            aria-hidden
            className="absolute top-1/2 -translate-y-1/2 -end-3 w-6 h-6 rounded-full bg-sand-50 dark:bg-ink-900"
          />
          <div className="mx-5 border-t border-dashed border-sand-300 dark:border-ink-700" />
        </div>

        {/* QR stub */}
        <div className="px-5 py-5 flex flex-col items-center bg-sand-50/70 dark:bg-ink-900/30">
          <div className="bg-white rounded-2xl p-3 border border-sand-200/60 shadow-sm">
            <QRCodeSVG
              value={pass.qrPayload}
              size={184}
              level="H"
              bgColor="#FFFFFF"
              fgColor="#0F172A"
              includeMargin={false}
            />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-500 mt-3">
            {t('visitorPasses.ticket.accessCode')}
          </p>
          <button
            type="button"
            onClick={onCopyCode}
            className="mt-1 inline-flex items-center gap-1.5 text-xl font-extrabold tabular-nums text-ink-950 dark:text-white tracking-widest hover:opacity-70 active:scale-95 transition-all duration-base ease-smooth"
            aria-label={t('visitorPasses.ticket.copyCodeAria')}
          >
            <span dir="ltr">{pass.code}</span>
            <Copy size={14} className="text-ink-500" />
          </button>
          <p className="text-[11px] text-ink-500 dark:text-ink-100 mt-2 text-center max-w-xs">
            {t('visitorPasses.ticket.instructions')}
          </p>
        </div>
      </motion.article>

      <motion.div variants={STAGGER_ITEM} className="mt-3">
        <InlineNotice notice={shareNotice} onDismiss={() => setShareNotice(null)} />
      </motion.div>

      {/* Share + secondary actions */}
      <motion.div variants={STAGGER_ITEM} className="mt-3 space-y-2.5">
        <button
          type="button"
          onClick={onShareClick}
          disabled={sharing}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-ink-950 dark:bg-white text-white dark:text-ink-950 py-3.5 text-sm font-bold shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-base ease-smooth disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
          {t('visitorPasses.ticket.share')}
        </button>
        <button
          type="button"
          onClick={onIssueAnother}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-white dark:bg-ink-700 border border-sand-200/60 dark:border-ink-700 text-ink-700 dark:text-ink-100 py-3 text-sm font-semibold hover:shadow-sm active:scale-[0.99] transition-all duration-base ease-smooth"
        >
          {t('visitorPasses.ticket.issueAnother')}
        </button>
      </motion.div>
    </motion.section>
  );
}
