import { useAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import {
  ArrowRight,
  Building,
  Calendar,
  Compass,
  Eye,
  Heart,
  MapPin,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Gradient } from '@/components/community/Gradient';
import { TopBar } from '@/components/TopBar';

/**
 * Discover tab adapts to user role:
 *   - Anonymous / prospect → real-estate flows (tour, units, EOI, book visit)
 *   - Resident             → community flows (events, offers, marketplace)
 *
 * For Phase 4.5 we approximate role from auth state (signed-in = resident).
 * Real role from API lands in Week 2 via `useMe()`.
 */
export default function Discover() {
  const { t } = useTranslation();
  const { isSignedIn } = useAuth();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-ink-50 dark:bg-ink-900">
      <TopBar title={t('discover.title')} unreadCount={3} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {isSignedIn ? <ResidentView /> : <ProspectView />}
      </ScrollView>
    </SafeAreaView>
  );
}

function ResidentView() {
  return (
    <>
      <Hero
        from="#06B6D4"
        to="#7C3AED"
        title="Events near you"
        sub="Pool party Friday · Yoga Saturday · Cinema Thursday"
        Icon={Sparkles}
      />
      <SectionTitle>Tonight</SectionTitle>
      <Row Icon={Calendar} title="Cinema Under the Stars" sub="9 PM · Amphitheater · Free" />
      <Row Icon={Heart} title="Resident-only spa offer" sub="20% off · The Wellness Lab" />
      <SectionTitle>Marketplace</SectionTitle>
      <Row Icon={MapPin} title="Madinet Masr · Outlets" sub="Restaurants, cafes, services" />
      <PlaceholderNote>Full marketplace + offers feed lands in Week 2.</PlaceholderNote>
    </>
  );
}

function ProspectView() {
  return (
    <>
      <Hero
        from="#7C3AED"
        to="#EC4899"
        title="Tour Madinet Masr"
        sub="Take a virtual tour or book an in-person visit"
        Icon={Eye}
      />
      <SectionTitle>Explore</SectionTitle>
      <Row Icon={Building} title="Virtual tour" sub="Walk through villas and apartments in 3D" />
      <Row Icon={MapPin} title="Master plan" sub="Zones · Amenities · Future phases" />
      <Row
        Icon={Calendar}
        title="Book a site visit"
        sub="Speak to a sales advisor at the showroom"
      />
      <SectionTitle>Other projects</SectionTitle>
      <Row Icon={Compass} title="EOIs · 6 projects worldwide" sub="Register your interest" />
      <PlaceholderNote>
        Booking, EOI submission, and chat with sales land in Week 2.
      </PlaceholderNote>
      <Pressable
        onPress={() => router.push('/(auth)/sign-in')}
        className="mt-2 bg-brand-500 rounded-2xl py-3 items-center"
      >
        <Text className="text-white font-semibold">Sign in to save your progress</Text>
      </Pressable>
    </>
  );
}

function Hero({
  from,
  to,
  title,
  sub,
  Icon,
}: {
  from: string;
  to: string;
  title: string;
  sub: string;
  Icon: LucideIcon;
}) {
  return (
    <Gradient from={from} to={to} radius={20} style={{ marginBottom: 16 }}>
      <View className="p-5">
        <View className="w-10 h-10 rounded-xl bg-white/25 items-center justify-center mb-3">
          <Icon color="#fff" size={20} />
        </View>
        <Text className="text-white text-xl font-extrabold mb-1">{title}</Text>
        <Text className="text-white/85 text-sm" numberOfLines={2}>
          {sub}
        </Text>
      </View>
    </Gradient>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-[11px] font-bold uppercase tracking-widest text-ink-400 mt-2 mb-1.5">
      {children}
    </Text>
  );
}

function Row({ Icon, title, sub }: { Icon: LucideIcon; title: string; sub: string }) {
  return (
    <View className="flex-row items-center bg-white dark:bg-ink-700 rounded-2xl p-3 mb-2 border border-ink-100 dark:border-ink-700">
      <View className="w-9 h-9 rounded-lg bg-ink-100 dark:bg-ink-900 items-center justify-center mr-3">
        <Icon color="#475569" size={18} />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-sm font-semibold text-ink-900 dark:text-white" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-[11px] text-ink-500 dark:text-ink-100" numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <ArrowRight color="#94A3B8" size={16} />
    </View>
  );
}

function PlaceholderNote({ children }: { children: React.ReactNode }) {
  return (
    <View className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl px-3 py-2 my-2">
      <Text className="text-[11px] text-amber-800 dark:text-amber-200">{children}</Text>
    </View>
  );
}
