import { useUser } from '@clerk/clerk-expo';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import {
  Award,
  ChevronDown,
  ChevronRight,
  Clock,
  Cloud,
  CreditCard,
  Home as HomeIcon,
  KeyRound,
  Megaphone,
  Mic,
  Moon,
  Sun,
  UserPlus,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/TopBar';
import { colors } from '@/lib/theme';

// ============================================================================
// Mock data — replaces the prototype's `state.*` until Week 2 wires the API.
// ============================================================================

const MOCK_UNIT = { name: 'Villa 12', project: 'New Cairo' };
const MOCK_ROLE_LABEL = 'roleOwner';
const MOCK_OPEN_REQUESTS = 3;
const MOCK_DUE_PAYMENTS = 1;

interface WeatherState {
  temp: string;
  icon: LucideIcon;
  iconBg: string;
  line1: string;
  line2: string;
}

const WEATHER_STATES: WeatherState[] = [
  {
    temp: '28°',
    icon: Sun,
    iconBg: 'linear-gradient(135deg,#FBBF24,#F59E0B)', // amber
    line1: 'Sunny in New Cairo',
    line2: 'Perfect day for a swim — pool is open till 10 PM',
  },
  {
    temp: '24°',
    icon: Cloud,
    iconBg: 'linear-gradient(135deg,#60A5FA,#3B82F6)', // blue
    line1: 'Partly cloudy',
    line2: 'Comfortable evening — great for an outdoor walk',
  },
  {
    temp: '19°',
    icon: Moon,
    iconBg: 'linear-gradient(135deg,#7C3AED,#5B21B6)', // purple
    line1: 'Cool night',
    line2: 'Cinema night at the amphitheater starts in 2h',
  },
  {
    temp: '31°',
    icon: Sun,
    iconBg: 'linear-gradient(135deg,#F97316,#EA580C)', // orange
    line1: 'Hot afternoon',
    line2: 'Indoor gym & co-working space are AC-cooled',
  },
];

// Solid color fallback for each weather state (RN doesn't render CSS gradients).
const WEATHER_FALLBACK_BG = ['#F59E0B', '#3B82F6', '#7C3AED', '#EA580C'];

// ============================================================================
// Helpers
// ============================================================================

function getGreeting(firstName: string): { line1: string; line2: string; sub: string } {
  // Mirrors the prototype's 5-bucket time-of-day greeting (server.py + index.html).
  // TODO Week 2: pull greeting strings through i18n once tone is finalised.
  const h = new Date().getHours();
  if (h < 5)
    return {
      line1: `Up late, ${firstName}?`,
      line2: 'Quiet hours · we got you',
      sub: 'Night owl mode — Farah is awake too',
    };
  if (h < 12)
    return {
      line1: `Good morning, ${firstName}!`,
      line2: 'Have a great day',
      sub: 'Morning brief is ready below',
    };
  if (h < 17)
    return {
      line1: `Good afternoon, ${firstName}!`,
      line2: "Hope you're well",
      sub: 'Your community concierge is ready',
    };
  if (h < 21)
    return {
      line1: `Good evening, ${firstName}!`,
      line2: 'Winding down?',
      sub: 'A few things lined up for tonight',
    };
  return {
    line1: `Hi, ${firstName}!`,
    line2: 'Late night?',
    sub: 'Farah is here whenever you need',
  };
}

function getWeather(): WeatherState {
  const h = new Date().getHours();
  return WEATHER_STATES[Math.min(3, Math.floor(h / 6))]!;
}

// ============================================================================
// Smart Suggestions (For You row)
// ============================================================================

type Tone = 'blue' | 'amber' | 'red' | 'green' | 'purple';

interface Suggestion {
  key: string;
  tone: Tone;
  Icon: LucideIcon;
  title: string;
  sub: string;
  cta: string;
  onPress: () => void;
}

const TONE_CHIP: Record<Tone, { bg: string; fg: string }> = {
  blue: { bg: '#DBEAFE', fg: '#2563EB' },
  amber: { bg: '#FEF3C7', fg: '#D97706' },
  red: { bg: '#FEE2E2', fg: '#DC2626' },
  green: { bg: '#D1FAE5', fg: '#059669' },
  purple: { bg: '#EDE9FE', fg: '#7C3AED' },
};

function SuggestionCard({ s }: { s: Suggestion }) {
  const tone = TONE_CHIP[s.tone];
  return (
    <Pressable
      onPress={s.onPress}
      className="w-64 mr-3 bg-white dark:bg-ink-700 rounded-2xl p-4 border border-ink-100 dark:border-ink-700"
    >
      <View
        className="w-9 h-9 rounded-lg items-center justify-center mb-3"
        style={{ backgroundColor: tone.bg }}
      >
        <s.Icon color={tone.fg} size={18} />
      </View>
      <Text className="text-sm font-semibold text-ink-900 dark:text-white mb-1" numberOfLines={2}>
        {s.title}
      </Text>
      <Text className="text-xs text-ink-500 dark:text-ink-100 mb-3" numberOfLines={2}>
        {s.sub}
      </Text>
      <Text className="text-xs font-semibold" style={{ color: tone.fg }}>
        {s.cta} ›
      </Text>
    </Pressable>
  );
}

function buildSuggestions(): Suggestion[] {
  // For Phase 4.5 these are hardcoded; the prototype builds them dynamically
  // from state.requests / state.invoices / hour. Week 2 wires the same logic
  // against real API data.
  return [
    {
      key: 'maintenance',
      tone: 'blue',
      Icon: Wrench,
      title: 'Track your AC repair ticket',
      sub: 'Status: Scheduled · Tap to follow up',
      cta: 'Open ticket',
      onPress: () => router.push('/(tabs)/services'),
    },
    {
      key: 'pool',
      tone: 'amber',
      Icon: Clock,
      title: 'Pool Party · Friday 8 PM',
      sub: '400+ residents going · RSVP now',
      cta: 'See event',
      onPress: () => router.push('/(tabs)/community'),
    },
    {
      key: 'payment',
      tone: 'red',
      Icon: CreditCard,
      title: 'Maintenance fee due',
      sub: 'Auto-pay can handle this for you',
      cta: 'Review',
      onPress: () => router.push('/(tabs)/services'),
    },
    {
      key: 'loyalty',
      tone: 'green',
      Icon: Award,
      title: "You're close to Platinum",
      sub: 'Just 240 points away — earn at outlets',
      cta: 'View rewards',
      onPress: () => router.push('/(tabs)/profile'),
    },
    {
      key: 'farah',
      tone: 'purple',
      Icon: Mic,
      title: 'Plan your weekend with Farah',
      sub: '"احجزلي جلسة سبا السبت" — تمام كده',
      cta: 'Talk now',
      onPress: () => router.push('/voice'),
    },
  ];
}

// ============================================================================
// Primary CTAs (2×2)
// ============================================================================

interface Cta {
  key: string;
  Icon: LucideIcon;
  title: string;
  sub: string;
  bg: string;
  fg: string;
  onPress: () => void;
}

function CtaTile({ cta }: { cta: Cta }) {
  return (
    <Pressable
      onPress={cta.onPress}
      className="flex-1 bg-white dark:bg-ink-700 rounded-2xl p-4 flex-row items-center border border-ink-100 dark:border-ink-700"
    >
      <View
        className="w-10 h-10 rounded-lg items-center justify-center mr-3"
        style={{ backgroundColor: cta.bg }}
      >
        <cta.Icon color={cta.fg} size={20} />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-sm font-semibold text-ink-900 dark:text-white" numberOfLines={1}>
          {cta.title}
        </Text>
        <Text className="text-[11px] text-ink-500 dark:text-ink-100" numberOfLines={1}>
          {cta.sub}
        </Text>
      </View>
    </Pressable>
  );
}

// ============================================================================
// Status pills
// ============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function StatusPill({
  count,
  label,
  action,
  tint,
  bg,
  onPress,
}: {
  count: number;
  label: string;
  action: string;
  tint: string;
  bg: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const pillStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 18, stiffness: 260 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 220 });
      }}
      style={[
        pillStyle,
        {
          flex: 1,
          borderRadius: 16,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 3,
        },
      ]}
    >
      <BlurView intensity={35} tint="light" style={{ borderRadius: 16, overflow: 'hidden' }}>
        <View className="flex-row items-center p-3 bg-white/65 border border-white/50 rounded-2xl">
          <View
            className="w-9 h-9 rounded-lg items-center justify-center mr-3"
            style={{
              backgroundColor: bg,
              shadowColor: tint,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Text style={{ color: tint }} className="font-bold text-base">
              {count}
            </Text>
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-xs font-semibold text-ink-900" numberOfLines={1}>
              {label}
            </Text>
            <Text className="text-[11px] text-ink-500">{action}</Text>
          </View>
        </View>
      </BlurView>
    </AnimatedPressable>
  );
}

// ============================================================================
// Main screen
// ============================================================================

export default function Home() {
  const { t } = useTranslation();
  const { user } = useUser();

  // Defaults to "Sara" (the prototype's demo protagonist) so anonymous demos
  // still feel personalised. Real signed-in users see their actual first name.
  const firstName = user?.firstName ?? 'Sara';

  const greeting = useMemo(() => getGreeting(firstName), [firstName]);
  const weather = useMemo(() => getWeather(), []);
  const suggestions = useMemo(() => buildSuggestions(), []);

  const ctas: Cta[] = useMemo(
    () => [
      {
        key: 'gate',
        Icon: KeyRound,
        title: t('home.cta.openGate'),
        sub: t('home.cta.openGateSub', { unit: MOCK_UNIT.name }),
        bg: '#CFFAFE',
        fg: '#0891B2',
        onPress: () => router.push('/qr'),
      },
      {
        key: 'farah',
        Icon: Mic,
        title: t('home.cta.farah'),
        sub: t('home.cta.farahSub'),
        bg: '#EDE9FE',
        fg: '#7C3AED',
        onPress: () => router.push('/voice'),
      },
      {
        key: 'invite',
        Icon: UserPlus,
        title: t('home.cta.invite'),
        sub: t('home.cta.inviteSub'),
        bg: '#DBEAFE',
        fg: '#2563EB',
        onPress: () => router.push('/qr'),
      },
      {
        key: 'report',
        Icon: Wrench,
        title: t('home.cta.report'),
        sub: t('home.cta.reportSub'),
        bg: '#FEE2E2',
        fg: '#DC2626',
        onPress: () => router.push('/(tabs)/services'),
      },
    ],
    [t],
  );

  const WeatherIcon = weather.icon;
  const weatherIdx = WEATHER_STATES.indexOf(weather);
  const weatherBg = WEATHER_FALLBACK_BG[weatherIdx] ?? WEATHER_FALLBACK_BG[0];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-ink-50 dark:bg-ink-900">
      <TopBar title={t('app.name')} unreadCount={3} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting ─────────────────────────────────────── */}
        <Text className="text-[26px] font-extrabold text-ink-900 dark:text-white leading-tight">
          {greeting.line1}
        </Text>
        <Text className="text-[26px] font-extrabold text-ink-900 dark:text-white leading-tight mb-1">
          {greeting.line2}
        </Text>
        <Text className="text-sm text-ink-500 dark:text-ink-100 mb-3">{greeting.sub}</Text>

        {/* Role + unit pill row */}
        <View className="flex-row flex-wrap items-center gap-2 mb-5">
          <View className="bg-violet-100 dark:bg-violet-900/40 px-3 py-1 rounded-full">
            <Text className="text-[11px] font-semibold text-violet-700 dark:text-violet-300">
              {t(`home.${MOCK_ROLE_LABEL}`)}
            </Text>
          </View>
          <Pressable className="flex-row items-center bg-violet-100 dark:bg-violet-900/40 px-3 py-1 rounded-full">
            <HomeIcon color="#7C3AED" size={12} />
            <Text className="text-[11px] font-semibold text-violet-700 dark:text-violet-300 mx-1">
              {MOCK_UNIT.name} · {MOCK_UNIT.project}
            </Text>
            <ChevronDown color="#7C3AED" size={11} />
          </Pressable>
        </View>

        {/* ── Weather + AI context bar ─────────────────────── */}
        <View className="flex-row items-center bg-white dark:bg-ink-700 rounded-2xl p-3 mb-5 border border-ink-100 dark:border-ink-700">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: weatherBg }}
          >
            <WeatherIcon color="#fff" size={18} />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-sm font-semibold text-ink-900 dark:text-white" numberOfLines={1}>
              {weather.line1}
            </Text>
            <Text className="text-xs text-ink-500 dark:text-ink-100" numberOfLines={2}>
              {weather.line2}
            </Text>
          </View>
          <Text className="text-2xl font-extrabold text-ink-900 dark:text-white ml-2">
            {weather.temp}
          </Text>
        </View>

        {/* ── For You (horizontal smart suggestions) ───────── */}
        <View className="flex-row items-end justify-between mb-2">
          <View className="flex-row items-center">
            <View className="w-1.5 h-1.5 rounded-full bg-brand-500 mr-2" />
            <Text className="text-base font-bold text-ink-900 dark:text-white">
              {t('home.forYou')}
            </Text>
          </View>
          <Text className="text-[11px] text-ink-400">{t('home.aiPersonalized')}</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-4 mb-5"
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {suggestions.map((s) => (
            <SuggestionCard key={s.key} s={s} />
          ))}
        </ScrollView>

        {/* ── Primary CTAs (2×2) ───────────────────────────── */}
        <View className="flex-row gap-3 mb-3">
          <CtaTile cta={ctas[0]!} />
          <CtaTile cta={ctas[1]!} />
        </View>
        <View className="flex-row gap-3 mb-5">
          <CtaTile cta={ctas[2]!} />
          <CtaTile cta={ctas[3]!} />
        </View>

        {/* ── Status pills ─────────────────────────────────── */}
        <View className="flex-row gap-3 mb-5">
          <StatusPill
            count={MOCK_OPEN_REQUESTS}
            label={t('home.openRequests')}
            action={t('home.viewAll')}
            tint="#7C3AED"
            bg="#EDE9FE"
            onPress={() => router.push('/requests')}
          />
          <StatusPill
            count={MOCK_DUE_PAYMENTS}
            label={t('home.duePayments')}
            action={t('home.payNow')}
            tint="#DC2626"
            bg="#FEE2E2"
            onPress={() => router.push('/(tabs)/services')}
          />
        </View>

        {/* ── Latest news ──────────────────────────────────── */}
        <View className="flex-row items-end justify-between mb-2">
          <Text className="text-base font-bold text-ink-900 dark:text-white">
            {t('home.latest')}
          </Text>
          <Pressable onPress={() => router.push('/notifications')}>
            <Text className="text-xs font-semibold text-brand-500">{t('home.seeAll')}</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => router.push('/notifications')}
          className="flex-row items-center bg-white dark:bg-ink-700 rounded-2xl p-3 border border-ink-100 dark:border-ink-700"
        >
          <View
            className="w-9 h-9 rounded-lg items-center justify-center mr-3"
            style={{ backgroundColor: '#FEF3C7' }}
          >
            <Megaphone color="#D97706" size={18} />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-sm font-semibold text-ink-900 dark:text-white" numberOfLines={1}>
              Water maintenance scheduled
            </Text>
            <Text className="text-[11px] text-ink-500 dark:text-ink-100" numberOfLines={1}>
              Building 4-6 · Tomorrow 10 AM – 2 PM
            </Text>
          </View>
          <ChevronRight color={colors.ink[400]} size={18} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
