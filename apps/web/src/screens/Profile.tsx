import { useAuth, useUser } from '@clerk/clerk-react';
import {
  AlertTriangle,
  Building2,
  CheckSquare,
  ClipboardList,
  Cog,
  CreditCard,
  FileText,
  HardHat,
  History,
  Home,
  Lock,
  LogOut,
  MessageCircle,
  Moon,
  Phone,
  ShieldCheck,
  Star,
  Trash2,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { CompletionBar } from '@/components/profile/CompletionBar';
import { ProfileRow } from '@/components/profile/ProfileRow';
import { TopBar } from '@/components/TopBar';
import { AnimatedCount } from '@/components/ui/AnimatedCount';
import { ACTIVITY_TONE, PROFILE_ACTIVITY } from '@/lib/mock/activities';
import { useUnreadCount } from '@/lib/useNotifications';
import { completionPercent, useProfileStore } from '@/stores/profileStore';
import { useThemeStore } from '@/stores/themeStore';

const MOCK_UNIT = { name: 'Villa 12', project: 'New Cairo' };
const MOCK_STATS = { requests: 12, active: 3, points: 2450 };

interface Section {
  title: string;
  rows: Array<{
    key: string;
    Icon: LucideIcon;
    label: string;
    onClick?: () => void;
    trailing?: ReactNode;
    destructive?: boolean;
  }>;
}

const placeholder =
  (title: string, body = 'Coming in Week 2.') =>
  () => {
    window.alert(`${title}\n\n${body}`);
  };

// Dark-mode state lives in `useThemeStore` so the TopBar toggle and this
// row stay in sync. Local hook removed in favour of the shared store.

export function Profile() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const isDark = useThemeStore((s) => s.isDark);
  const setDark = useThemeStore((s) => s.setDark);
  const completion = useProfileStore((s) => s.completion);
  const unreadCount = useUnreadCount();

  const completionStats = useMemo(() => {
    const items = Object.values(completion);
    return {
      done: items.filter(Boolean).length,
      total: items.length,
      percent: completionPercent(completion),
    };
  }, [completion]);

  const firstName = user?.firstName ?? 'Sara';
  const lastName = user?.lastName ?? 'Ahmed';
  const email = user?.primaryEmailAddress?.emailAddress;
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

  const onSignOut = async () => {
    if (!window.confirm('Sign out of Stitch?')) return;
    await signOut();
    navigate('/sign-in', { replace: true });
  };

  const onDelete = () => {
    if (!window.confirm('Permanently delete your account and all data?')) return;
    placeholder('Delete account', 'Backend deletion lands in Week 2.')();
  };

  const toggleLanguage = () => {
    const next = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(next);
  };

  const sections: Section[] = useMemo(
    () => [
      {
        title: 'Account',
        rows: [
          {
            key: 'edit',
            Icon: Cog,
            label: 'Edit Profile & Photo',
            onClick: placeholder('Edit profile'),
          },
          {
            key: 'lang',
            Icon: Cog,
            label: `Language · ${i18n.language === 'ar' ? 'العربية' : 'English'}`,
            onClick: toggleLanguage,
          },
        ],
      },
      {
        title: 'Unit & Members',
        rows: [
          { key: 'unit', Icon: Home, label: 'Unit Details', onClick: placeholder('Unit details') },
          {
            key: 'qrlog',
            Icon: ClipboardList,
            label: 'QR Activity Log',
            onClick: () => navigate('/qr'),
          },
          {
            key: 'const',
            Icon: HardHat,
            label: 'Construction & Handover',
            onClick: placeholder('Construction'),
          },
          {
            key: 'docs',
            Icon: FileText,
            label: 'Ownership Documents',
            onClick: placeholder('Documents'),
          },
          {
            key: 'reqs',
            Icon: Wrench,
            label: 'My Service Requests',
            onClick: placeholder('Service requests', '3 open · Coming in Week 2.'),
          },
          {
            key: 'inv',
            Icon: CreditCard,
            label: 'Invoices & Payments',
            onClick: placeholder('Invoices'),
          },
          {
            key: 'hist',
            Icon: History,
            label: 'Payment History',
            onClick: placeholder('Payment history'),
          },
          {
            key: 'mem',
            Icon: Users,
            label: t('family.entry.title'),
            onClick: () => navigate('/profile/family'),
          },
          {
            key: 'otel',
            Icon: Building2,
            label: 'My OTEL Booking',
            onClick: placeholder('OTEL booking'),
          },
        ],
      },
      {
        title: 'Community',
        rows: [
          {
            key: 'loyalty',
            Icon: Star,
            label: 'Loyalty & Partners',
            onClick: placeholder('Loyalty', 'Gold tier · 2,450 points · 240 to Platinum'),
          },
          {
            key: 'viol',
            Icon: AlertTriangle,
            label: 'Violations & Terms',
            onClick: placeholder('Violations'),
          },
          {
            key: 'surv',
            Icon: CheckSquare,
            label: 'Surveys & Feedback',
            onClick: placeholder('Surveys'),
          },
          {
            key: 'guide',
            Icon: FileText,
            label: 'Community Guidelines',
            onClick: placeholder('Guidelines'),
          },
          {
            key: 'contact',
            Icon: MessageCircle,
            label: 'Contact Us',
            onClick: () => navigate('/voice'),
          },
          { key: 'faq', Icon: ShieldCheck, label: 'Common Questions', onClick: placeholder('FAQ') },
        ],
      },
      {
        title: 'Preferences',
        rows: [
          {
            key: 'dark',
            Icon: Moon,
            label: 'Dark Mode',
            trailing: (
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDark}
                  onChange={(e) => setDark(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-ink-100 dark:bg-ink-900 peer-checked:bg-brand-500 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5" />
              </label>
            ),
          },
          {
            key: 'pw',
            Icon: Lock,
            label: 'Change Password',
            onClick: placeholder('Change password'),
          },
        ],
      },
      {
        title: 'Session',
        rows: isSignedIn
          ? [
              { key: 'out', Icon: LogOut, label: t('profile.signOut'), onClick: onSignOut },
              {
                key: 'del',
                Icon: Trash2,
                label: 'Delete Account',
                destructive: true,
                onClick: onDelete,
              },
            ]
          : [
              {
                key: 'in',
                Icon: Phone,
                label: t('profile.signIn'),
                onClick: () => navigate('/sign-in'),
              },
            ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i18n.language, isSignedIn, isDark],
  );

  return (
    <>
      <TopBar title={t('profile.title')} unreadCount={unreadCount} />

      <div className="pb-6">
        {/* Identity card */}
        <div className="mx-4 mt-3 p-5 bg-white dark:bg-ink-700 rounded-2xl border border-ink-100 dark:border-ink-700">
          <div className="flex flex-row items-center">
            <div className="w-16 h-16 rounded-full bg-brand-500 flex items-center justify-center mr-4 flex-shrink-0">
              <span className="text-white text-xl font-bold">{initials || 'S'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-ink-900 dark:text-white truncate">
                {firstName} {lastName}
              </p>
              {email && <p className="text-xs text-ink-500 dark:text-ink-100 truncate">{email}</p>}
              <div className="flex flex-row items-center mt-1.5">
                <span className="bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 rounded-full text-[10px] font-semibold text-violet-700 dark:text-violet-300 mr-2">
                  Owner
                </span>
                <span className="text-[11px] text-ink-500 dark:text-ink-100 truncate">
                  {MOCK_UNIT.name} · {MOCK_UNIT.project}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-row mt-5 pt-4 border-t border-white/40 dark:border-white/10">
            <Stat label="Requests" value={MOCK_STATS.requests} />
            <div className="w-px bg-white/40 dark:bg-white/10" />
            <Stat label="Active" value={MOCK_STATS.active} />
            <div className="w-px bg-white/40 dark:bg-white/10" />
            <Stat label="Points" value={MOCK_STATS.points} />
          </div>
        </div>

        <CompletionBar
          percent={completionStats.percent}
          doneCount={completionStats.done}
          totalCount={completionStats.total}
        />

        <div className="px-4 pt-2 pb-1">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
            Recent activity
          </h3>
        </div>
        <div className="mx-4 mb-4 bg-white dark:bg-ink-700 rounded-2xl overflow-hidden border border-ink-100 dark:border-ink-700">
          {PROFILE_ACTIVITY.map((a, i) => {
            const tone = ACTIVITY_TONE[a.tone];
            const Icon = a.icon;
            return (
              <div
                key={a.id}
                className={`flex flex-row items-center px-4 py-3 ${
                  i < PROFILE_ACTIVITY.length - 1
                    ? 'border-b border-ink-100 dark:border-ink-700'
                    : ''
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 flex-shrink-0"
                  style={{ backgroundColor: tone.bg }}
                >
                  <Icon color={tone.fg} size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-900 dark:text-white truncate">
                    {a.title}
                  </p>
                  <p className="text-[11px] text-ink-500 dark:text-ink-100">{a.when}</p>
                </div>
              </div>
            );
          })}
        </div>

        {sections.map((sec) => (
          <div key={sec.title}>
            <div className="px-4 pt-2 pb-1">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
                {sec.title}
              </h3>
            </div>
            <div className="mx-4 mb-3 bg-white dark:bg-ink-700 rounded-2xl overflow-hidden border border-ink-100 dark:border-ink-700">
              {sec.rows.map((row, i) => (
                <div
                  key={row.key}
                  className={
                    i < sec.rows.length - 1 ? 'border-b border-ink-100 dark:border-ink-700' : ''
                  }
                >
                  <ProfileRow
                    Icon={row.Icon}
                    label={row.label}
                    onClick={row.onClick}
                    trailing={row.trailing}
                    destructive={row.destructive}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 flex flex-col items-center">
      <span className="text-xl font-bold text-ink-900 dark:text-white tabular-nums">
        <AnimatedCount value={value} />
      </span>
      <span className="text-[11px] text-ink-500 dark:text-ink-100 mt-0.5">{label}</span>
    </div>
  );
}
