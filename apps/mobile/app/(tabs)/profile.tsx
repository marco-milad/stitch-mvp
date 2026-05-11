import { useAuth, useUser } from '@clerk/clerk-expo';
import { router } from 'expo-router';
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
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompletionBar } from '@/components/profile/CompletionBar';
import { ProfileRow } from '@/components/profile/ProfileRow';
import { TopBar } from '@/components/TopBar';
import { ACTIVITY_TONE, PROFILE_ACTIVITY } from '@/lib/mock/activities';
import { completionPercent, useProfileStore } from '@/stores/profileStore';

const MOCK_UNIT = { name: 'Villa 12', project: 'New Cairo' };
const MOCK_STATS = { requests: 12, active: 3, points: 2450 };

interface Section {
  title: string;
  rows: Array<{
    key: string;
    Icon: LucideIcon;
    label: string;
    onPress?: () => void;
    trailing?: React.ReactNode;
    destructive?: boolean;
  }>;
}

const placeholder =
  (title: string, body = 'Coming in Week 2.') =>
  () =>
    Alert.alert(title, body);

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const { colorScheme, setColorScheme } = useColorScheme();
  const completion = useProfileStore((s) => s.completion);

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

  const onSignOut = () => {
    Alert.alert(t('profile.signOut'), 'Sign out of Stitch?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: t('profile.signOut'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  const onDelete = () => {
    Alert.alert(
      'Delete account',
      'This will permanently remove your account and all data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: placeholder('Delete account', 'Backend deletion lands in Week 2.'),
        },
      ],
    );
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
            onPress: placeholder('Edit profile'),
          },
          {
            key: 'lang',
            Icon: Cog,
            label: `Language · ${i18n.language === 'ar' ? 'العربية' : 'English'}`,
            onPress: toggleLanguage,
          },
        ],
      },
      {
        title: 'Unit & Members',
        rows: [
          { key: 'unit', Icon: Home, label: 'Unit Details', onPress: placeholder('Unit details') },
          {
            key: 'qrlog',
            Icon: ClipboardList,
            label: 'QR Activity Log',
            onPress: () => router.push('/qr'),
          },
          {
            key: 'const',
            Icon: HardHat,
            label: 'Construction & Handover',
            onPress: placeholder('Construction'),
          },
          {
            key: 'docs',
            Icon: FileText,
            label: 'Ownership Documents',
            onPress: placeholder('Documents'),
          },
          {
            key: 'reqs',
            Icon: Wrench,
            label: 'My Service Requests',
            onPress: placeholder('Service requests', '3 open · Coming in Week 2.'),
          },
          {
            key: 'inv',
            Icon: CreditCard,
            label: 'Invoices & Payments',
            onPress: placeholder('Invoices'),
          },
          {
            key: 'hist',
            Icon: History,
            label: 'Payment History',
            onPress: placeholder('Payment history'),
          },
          { key: 'mem', Icon: Users, label: 'Unit Members', onPress: placeholder('Members') },
          {
            key: 'otel',
            Icon: Building2,
            label: 'My OTEL Booking',
            onPress: placeholder('OTEL booking'),
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
            onPress: placeholder('Loyalty', 'Gold tier · 2,450 points · 240 to Platinum'),
          },
          {
            key: 'viol',
            Icon: AlertTriangle,
            label: 'Violations & Terms',
            onPress: placeholder('Violations'),
          },
          {
            key: 'surv',
            Icon: CheckSquare,
            label: 'Surveys & Feedback',
            onPress: placeholder('Surveys'),
          },
          {
            key: 'guide',
            Icon: FileText,
            label: 'Community Guidelines',
            onPress: placeholder('Guidelines'),
          },
          {
            key: 'contact',
            Icon: MessageCircle,
            label: 'Contact Us',
            onPress: () => router.push('/voice'),
          },
          { key: 'faq', Icon: ShieldCheck, label: 'Common Questions', onPress: placeholder('FAQ') },
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
              <Switch
                value={colorScheme === 'dark'}
                onValueChange={(on) => setColorScheme(on ? 'dark' : 'light')}
                thumbColor="#fff"
                trackColor={{ true: '#06B6D4', false: '#CBD5E1' }}
              />
            ),
          },
          {
            key: 'pw',
            Icon: Lock,
            label: 'Change Password',
            onPress: placeholder('Change password'),
          },
        ],
      },
      {
        title: 'Session',
        rows: isSignedIn
          ? [
              { key: 'out', Icon: LogOut, label: t('profile.signOut'), onPress: onSignOut },
              {
                key: 'del',
                Icon: Trash2,
                label: 'Delete Account',
                destructive: true,
                onPress: onDelete,
              },
            ]
          : [
              {
                key: 'in',
                Icon: Phone,
                label: t('profile.signIn'),
                onPress: () => router.push('/(auth)/sign-in'),
              },
            ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i18n.language, isSignedIn, colorScheme],
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-ink-50 dark:bg-ink-900">
      <TopBar title={t('profile.title')} unreadCount={3} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-4 mt-3 p-5 bg-white dark:bg-ink-700 rounded-2xl border border-ink-100 dark:border-ink-700">
          <View className="flex-row items-center">
            <View className="w-16 h-16 rounded-full bg-brand-500 items-center justify-center mr-4">
              <Text className="text-white text-xl font-bold">{initials || 'S'}</Text>
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-lg font-bold text-ink-900 dark:text-white" numberOfLines={1}>
                {firstName} {lastName}
              </Text>
              {email && (
                <Text className="text-xs text-ink-500 dark:text-ink-100" numberOfLines={1}>
                  {email}
                </Text>
              )}
              <View className="flex-row items-center mt-1.5">
                <View className="bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 rounded-full mr-2">
                  <Text className="text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                    Owner
                  </Text>
                </View>
                <Text className="text-[11px] text-ink-500 dark:text-ink-100" numberOfLines={1}>
                  {MOCK_UNIT.name} · {MOCK_UNIT.project}
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row mt-5 pt-4 border-t border-ink-100 dark:border-ink-700">
            <Stat label="Requests" value={MOCK_STATS.requests.toString()} />
            <View className="w-px bg-ink-100 dark:bg-ink-700" />
            <Stat label="Active" value={MOCK_STATS.active.toString()} />
            <View className="w-px bg-ink-100 dark:bg-ink-700" />
            <Stat label="Points" value={MOCK_STATS.points.toLocaleString()} />
          </View>
        </View>

        <CompletionBar
          percent={completionStats.percent}
          doneCount={completionStats.done}
          totalCount={completionStats.total}
        />

        <View className="px-4 pt-2 pb-1">
          <Text className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
            Recent activity
          </Text>
        </View>
        <View className="mx-4 mb-4 bg-white dark:bg-ink-700 rounded-2xl overflow-hidden border border-ink-100 dark:border-ink-700">
          {PROFILE_ACTIVITY.map((a, i) => {
            const tone = ACTIVITY_TONE[a.tone];
            const Icon = a.icon;
            return (
              <View
                key={a.id}
                className={`flex-row items-center px-4 py-3 ${
                  i < PROFILE_ACTIVITY.length - 1
                    ? 'border-b border-ink-100 dark:border-ink-700'
                    : ''
                }`}
              >
                <View
                  className="w-8 h-8 rounded-lg items-center justify-center mr-3"
                  style={{ backgroundColor: tone.bg }}
                >
                  <Icon color={tone.fg} size={16} />
                </View>
                <View className="flex-1 min-w-0">
                  <Text
                    className="text-sm font-medium text-ink-900 dark:text-white"
                    numberOfLines={1}
                  >
                    {a.title}
                  </Text>
                  <Text className="text-[11px] text-ink-500 dark:text-ink-100">{a.when}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {sections.map((sec) => (
          <View key={sec.title}>
            <View className="px-4 pt-2 pb-1">
              <Text className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
                {sec.title}
              </Text>
            </View>
            <View className="mx-4 mb-3 bg-white dark:bg-ink-700 rounded-2xl overflow-hidden border border-ink-100 dark:border-ink-700">
              {sec.rows.map((row, i) => (
                <View
                  key={row.key}
                  className={
                    i < sec.rows.length - 1 ? 'border-b border-ink-100 dark:border-ink-700' : ''
                  }
                >
                  <ProfileRow
                    Icon={row.Icon}
                    label={row.label}
                    onPress={row.onPress}
                    trailing={row.trailing}
                    destructive={row.destructive}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-xl font-bold text-ink-900 dark:text-white">{value}</Text>
      <Text className="text-[11px] text-ink-500 dark:text-ink-100 mt-0.5">{label}</Text>
    </View>
  );
}
