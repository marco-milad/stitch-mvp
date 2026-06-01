import { useAuth } from '@clerk/clerk-expo';
import { endpoints } from '@stitch/api-client';
import type { MaintenanceRequest, RequestStatus, RequestUrgency } from '@stitch/types';
import { useQuery } from '@tanstack/react-query';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronLeft, RefreshCw, Wrench } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buildApiClient } from '@/lib/api';
import { colors } from '@/lib/theme';

// Glow / chip palette per status. The dot uses `tint` for fill + matching
// shadow so it reads as "lit". Chip text reuses `tint`; chip background is
// a tinted glass.
const STATUS_PALETTE: Record<
  RequestStatus,
  { tint: string; chipBg: string; chipText: string; ring: string }
> = {
  pending: {
    tint: '#F59E0B',
    chipBg: 'bg-amber-100/70',
    chipText: 'text-amber-800',
    ring: 'border-amber-300/60',
  },
  in_progress: {
    tint: '#0EA5E9',
    chipBg: 'bg-sky-100/70',
    chipText: 'text-sky-800',
    ring: 'border-sky-300/60',
  },
  resolved: {
    tint: '#10B981',
    chipBg: 'bg-emerald-100/70',
    chipText: 'text-emerald-800',
    ring: 'border-emerald-300/60',
  },
};

const URGENCY_STYLES: Record<RequestUrgency, string> = {
  routine: 'text-ink-400',
  priority: 'text-amber-600',
  urgent: 'text-red-600',
};

function formatRelative(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return locale === 'ar' ? 'دلوقتي' : 'just now';
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 30) return rtf.format(-days, 'day');
  const months = Math.floor(days / 30);
  if (months < 12) return rtf.format(-months, 'month');
  return rtf.format(-Math.floor(months / 12), 'year');
}

// ─── Glowing status indicator ──────────────────────────────────────────────
// Coloured dot with a matching shadow halo. shadowColor + shadowOpacity carry
// the "glow"; elevation gives Android an equivalent lift. NativeWind doesn't
// expose shadowColor, so this stays inline-style.

function StatusDot({ tint }: { tint: string }) {
  return (
    <View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: tint,
        shadowColor: tint,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 6,
      }}
    />
  );
}

// ─── Background gradient ──────────────────────────────────────────────────
// Soft brand→sky wash. Real BlurView blurs over *something* — without colour
// behind, the glass cards just look like flat white panels.

function ScreenBackground() {
  return (
    <LinearGradient
      colors={['#E0F2FE', '#EDE9FE', '#FCE7F3']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    />
  );
}

// ─── Header (glass) ───────────────────────────────────────────────────────

function Header({ title, count }: { title: string; count?: number }) {
  const { t } = useTranslation();
  return (
    <BlurView intensity={40} tint="light" className="px-4 pt-2 pb-3 border-b border-white/40">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="w-10 h-10 -ms-2 items-center justify-center active:scale-95"
          >
            <ChevronLeft color={colors.ink[700]} size={24} />
          </Pressable>
          <Text className="text-xl font-semibold text-ink-900">{title}</Text>
        </View>
        {count !== undefined && count > 0 && (
          <View className="px-2.5 py-0.5 rounded-full bg-white/60 border border-white/60">
            <Text className="text-xs font-semibold text-ink-700">
              {t('requests.openCount', { count })}
            </Text>
          </View>
        )}
      </View>
    </BlurView>
  );
}

// ─── Request card (glass + spring press) ──────────────────────────────────
// Tap animation uses Reanimated so the down/up state has a real tween, not
// the instant flip you get from NativeWind's `active:` variant.

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function RequestCard({ item, locale }: { item: MaintenanceRequest; locale: string }) {
  const { t } = useTranslation();
  const palette = STATUS_PALETTE[item.status];
  const urgencyColor = URGENCY_STYLES[item.urgency];

  const scale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 18, stiffness: 250 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 220 });
      }}
      accessibilityRole="button"
      style={[
        cardStyle,
        {
          marginHorizontal: 16,
          marginBottom: 12,
          borderRadius: 20,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 4,
        },
      ]}
    >
      <BlurView intensity={50} tint="light" style={{ borderRadius: 20, overflow: 'hidden' }}>
        <View className="p-4 bg-white/60 border border-white/40 rounded-2xl">
          <View className="flex-row items-start justify-between mb-1.5">
            <View className="flex-row items-center flex-1 me-2">
              <View className="me-2.5">
                <StatusDot tint={palette.tint} />
              </View>
              <Text className="flex-1 text-base font-semibold text-ink-900" numberOfLines={1}>
                {item.title ?? t(`requests.category.${item.category}`)}
              </Text>
            </View>
            <View className={`px-2 py-0.5 rounded-full border ${palette.chipBg} ${palette.ring}`}>
              <Text className={`text-[11px] font-semibold ${palette.chipText}`}>
                {t(`requests.status.${item.status}`)}
              </Text>
            </View>
          </View>
          <Text className="text-sm text-ink-600 mb-2 ms-5" numberOfLines={2}>
            {item.summary}
          </Text>
          <View className="flex-row items-center gap-2 ms-5">
            <Text className="text-xs text-ink-500">{t(`requests.category.${item.category}`)}</Text>
            <Text className="text-xs text-ink-400">·</Text>
            <Text className={`text-xs font-medium ${urgencyColor}`}>
              {t(`requests.urgency.${item.urgency}`)}
            </Text>
            <Text className="text-xs text-ink-400">·</Text>
            <Text className="text-xs text-ink-500">
              {t('requests.openedAt', { when: formatRelative(item.openedAt, locale) })}
            </Text>
          </View>
        </View>
      </BlurView>
    </AnimatedPressable>
  );
}

// ─── Loading skeleton (glass) ─────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <View className="px-4 pt-4">
      {[0, 1, 2, 3].map((i) => (
        <BlurView
          key={i}
          intensity={40}
          tint="light"
          style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 12 }}
        >
          <View className="p-4 bg-white/50 border border-white/40 rounded-2xl">
            <View className="h-4 bg-white/70 rounded mb-2 w-2/3" />
            <View className="h-3 bg-white/60 rounded mb-1 w-full" />
            <View className="h-3 bg-white/60 rounded w-1/2" />
          </View>
        </BlurView>
      ))}
    </View>
  );
}

// ─── Empty state with pulsing wrench ──────────────────────────────────────

function PulsingWrench() {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.12, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    glow.value = withRepeat(
      withTiming(0.85, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [glow, scale]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 0.9 + glow.value * 0.4 }],
  }));

  return (
    <View className="items-center justify-center mb-6" style={{ width: 96, height: 96 }}>
      <Animated.View
        style={[
          haloStyle,
          {
            position: 'absolute',
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: '#A5F3FC', // sky-200 — brand palette skips 200
          },
        ]}
      />
      <View
        className="w-20 h-20 rounded-full bg-white/70 border border-white/60 items-center justify-center"
        style={{
          shadowColor: colors.brand[500],
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.45,
          shadowRadius: 18,
          elevation: 8,
        }}
      >
        <Animated.View style={iconStyle}>
          <Wrench color={colors.brand[500]} size={32} />
        </Animated.View>
      </View>
    </View>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <BlurView
        intensity={50}
        tint="light"
        style={{ borderRadius: 28, overflow: 'hidden', width: '100%' }}
      >
        <View className="items-center px-8 py-10 bg-white/55 border border-white/50 rounded-[28px]">
          <PulsingWrench />
          <Text className="text-lg font-semibold text-ink-900 mb-1.5 text-center">
            {t('requests.empty.headline')}
          </Text>
          <Text className="text-sm text-ink-600 text-center leading-5">
            {t('requests.empty.body')}
          </Text>
        </View>
      </BlurView>
    </View>
  );
}

// ─── Error state (glass card + glassy retry button) ───────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <BlurView
        intensity={50}
        tint="light"
        style={{ borderRadius: 28, overflow: 'hidden', width: '100%' }}
      >
        <View className="items-center px-8 py-10 bg-white/55 border border-white/50 rounded-[28px]">
          <Text className="text-lg font-semibold text-ink-900 mb-1.5 text-center">
            {t('requests.error.headline')}
          </Text>
          <Text className="text-sm text-ink-600 text-center mb-5 leading-5">
            {t('requests.error.body')}
          </Text>
          <AnimatedPressable
            onPress={onRetry}
            onPressIn={() => {
              scale.value = withSpring(0.95, { damping: 18, stiffness: 260 });
            }}
            onPressOut={() => {
              scale.value = withSpring(1, { damping: 14, stiffness: 220 });
            }}
            accessibilityRole="button"
            style={[
              btnStyle,
              {
                shadowColor: colors.brand[500],
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 12,
                elevation: 6,
              },
            ]}
            className="flex-row items-center px-5 py-2.5 bg-brand-500 rounded-full border border-white/30"
          >
            <RefreshCw color={colors.white} size={16} />
            <Text className="ms-2 text-white font-semibold">{t('requests.retry')}</Text>
          </AnimatedPressable>
        </View>
      </BlurView>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────

export default function Requests() {
  const { t, i18n } = useTranslation();
  const { getToken } = useAuth();
  const client = useMemo(() => buildApiClient(getToken), [getToken]);
  const locale = i18n.language;

  const query = useQuery({
    queryKey: ['me', 'requests'],
    queryFn: () => endpoints.maintenance.listMyRequests(client),
  });

  const openCount = useMemo(
    () => (query.data ?? []).filter((r) => r.status !== 'resolved').length,
    [query.data],
  );

  return (
    <View className="flex-1">
      <ScreenBackground />
      <SafeAreaView edges={['top']} className="flex-1">
        <Header title={t('requests.title')} count={openCount} />
        {query.isPending ? (
          <LoadingSkeleton />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : query.data && query.data.length > 0 ? (
          <FlatList
            data={query.data}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <RequestCard item={item} locale={locale} />}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            refreshing={query.isFetching && !query.isPending}
            onRefresh={() => query.refetch()}
          />
        ) : (
          <EmptyState />
        )}
      </SafeAreaView>
    </View>
  );
}
