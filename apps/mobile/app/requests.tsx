import { useAuth } from '@clerk/clerk-expo';
import { endpoints } from '@stitch/api-client';
import type { MaintenanceRequest, RequestStatus, RequestUrgency } from '@stitch/types';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronLeft, RefreshCw, Wrench } from 'lucide-react-native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buildApiClient } from '@/lib/api';
import { colors } from '@/lib/theme';

const STATUS_STYLES: Record<RequestStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
  in_progress: { bg: 'bg-brand-100', text: 'text-brand-700' },
  resolved: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
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

function Header({ title, count }: { title: string; count?: number }) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center justify-between px-4 pt-2 pb-3 bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-700">
      <View className="flex-row items-center flex-1">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="w-10 h-10 -ms-2 items-center justify-center"
        >
          <ChevronLeft color={colors.ink[700]} size={24} />
        </Pressable>
        <Text className="text-xl font-semibold text-ink-900 dark:text-white">{title}</Text>
      </View>
      {count !== undefined && count > 0 && (
        <Text className="text-sm text-ink-500">{t('requests.openCount', { count })}</Text>
      )}
    </View>
  );
}

function RequestCard({ item, locale }: { item: MaintenanceRequest; locale: string }) {
  const { t } = useTranslation();
  const status = STATUS_STYLES[item.status];
  const urgencyColor = URGENCY_STYLES[item.urgency];
  return (
    <View className="mx-4 mb-3 p-4 bg-white dark:bg-ink-700 rounded-2xl border border-ink-100 dark:border-ink-700">
      <View className="flex-row items-start justify-between mb-1.5">
        <Text
          className="flex-1 text-base font-semibold text-ink-900 dark:text-white me-2"
          numberOfLines={1}
        >
          {item.title ?? t(`requests.category.${item.category}`)}
        </Text>
        <View className={`px-2 py-0.5 rounded-full ${status.bg}`}>
          <Text className={`text-[11px] font-semibold ${status.text}`}>
            {t(`requests.status.${item.status}`)}
          </Text>
        </View>
      </View>
      <Text className="text-sm text-ink-500 mb-2" numberOfLines={2}>
        {item.summary}
      </Text>
      <View className="flex-row items-center gap-2">
        <Text className="text-xs text-ink-400">{t(`requests.category.${item.category}`)}</Text>
        <Text className="text-xs text-ink-400">·</Text>
        <Text className={`text-xs font-medium ${urgencyColor}`}>
          {t(`requests.urgency.${item.urgency}`)}
        </Text>
        <Text className="text-xs text-ink-400">·</Text>
        <Text className="text-xs text-ink-400">
          {t('requests.openedAt', { when: formatRelative(item.openedAt, locale) })}
        </Text>
      </View>
    </View>
  );
}

function LoadingSkeleton() {
  return (
    <View className="px-4 pt-4">
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          className="mb-3 p-4 bg-white dark:bg-ink-700 rounded-2xl border border-ink-100 dark:border-ink-700"
        >
          <View className="h-4 bg-ink-100 dark:bg-ink-700 rounded mb-2 w-2/3" />
          <View className="h-3 bg-ink-100 dark:bg-ink-700 rounded mb-1 w-full" />
          <View className="h-3 bg-ink-100 dark:bg-ink-700 rounded w-1/2" />
        </View>
      ))}
    </View>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="w-16 h-16 rounded-full bg-brand-50 items-center justify-center mb-4">
        <Wrench color={colors.brand[500]} size={28} />
      </View>
      <Text className="text-lg font-semibold text-ink-900 dark:text-white mb-1 text-center">
        {t('requests.empty.headline')}
      </Text>
      <Text className="text-sm text-ink-500 text-center">{t('requests.empty.body')}</Text>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Text className="text-lg font-semibold text-ink-900 dark:text-white mb-1 text-center">
        {t('requests.error.headline')}
      </Text>
      <Text className="text-sm text-ink-500 text-center mb-5">{t('requests.error.body')}</Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        className="flex-row items-center px-5 py-2.5 bg-brand-500 rounded-full"
      >
        <RefreshCw color={colors.white} size={16} />
        <Text className="ms-2 text-white font-semibold">{t('requests.retry')}</Text>
      </Pressable>
    </View>
  );
}

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
    <SafeAreaView edges={['top']} className="flex-1 bg-ink-50 dark:bg-ink-900">
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
  );
}
