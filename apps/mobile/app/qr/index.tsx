import { router, Stack } from 'expo-router';
import { Camera, RefreshCw, Sun, UserPlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CountdownRing } from '@/components/qr/CountdownRing';
import { QrPattern } from '@/components/qr/QrPattern';
import { QR_LOG_ICON, QR_LOG_TONE, QR_LOGS } from '@/lib/mock/activities';
import { colors } from '@/lib/theme';
import { useProfileStore } from '@/stores/profileStore';

const QR_ROTATE_MS = 30_000;
const QR_SIZE = 240;
const MOCK_UNIT = { name: 'Villa 12', project: 'New Cairo' };

export default function QrScreen() {
  const { t } = useTranslation();
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const brightnessBoost = useProfileStore((s) => s.brightnessBoost);
  const toggleBrightness = useProfileStore((s) => s.toggleBrightness);

  const refresh = () => setSeed(Math.floor(Math.random() * 1e9));

  return (
    <SafeAreaView
      className={`flex-1 ${brightnessBoost ? 'bg-white' : 'bg-ink-50 dark:bg-ink-900'}`}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center justify-between px-4 py-3 border-b border-ink-100 dark:border-ink-700">
        <Text className="text-xl font-semibold text-ink-900 dark:text-white">{t('qr.title')}</Text>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Close">
          <X color={colors.ink[700]} size={22} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Text className="text-center text-xs text-ink-500 dark:text-ink-100 mb-2">
          Show this at the gate · {MOCK_UNIT.name} · {MOCK_UNIT.project}
        </Text>

        <View className="items-center justify-center my-3">
          <CountdownRing
            durationMs={QR_ROTATE_MS}
            size={QR_SIZE + 24}
            thickness={4}
            onTick={refresh}
          >
            <QrPattern seed={seed} size={QR_SIZE} brightness={brightnessBoost} />
          </CountdownRing>
          <Text className="mt-3 text-[11px] text-ink-500 dark:text-ink-100">
            Rotates every 30 seconds for security
          </Text>
        </View>

        <View className="flex-row gap-2 mb-5">
          <QuickAction
            Icon={UserPlus}
            label="Invite"
            tone="#7C3AED"
            bg="#EDE9FE"
            onPress={() =>
              Alert.alert('Invite guest', 'Coming in Week 2 — guest pass generation flow.')
            }
          />
          <QuickAction
            Icon={RefreshCw}
            label="Refresh"
            tone="#06B6D4"
            bg="#CFFAFE"
            onPress={refresh}
          />
          <QuickAction
            Icon={Sun}
            label={brightnessBoost ? 'Boosted' : 'Brightness'}
            tone={brightnessBoost ? '#F59E0B' : '#94A3B8'}
            bg={brightnessBoost ? '#FEF3C7' : '#F1F5F9'}
            onPress={toggleBrightness}
          />
        </View>

        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-base font-bold text-ink-900 dark:text-white">
            {t('qr.activity')}
          </Text>
          <Pressable onPress={() => Alert.alert('Activity log', 'Full log lands in Week 2.')}>
            <Text className="text-xs font-semibold text-brand-500">See all</Text>
          </Pressable>
        </View>

        <View className="bg-white dark:bg-ink-700 rounded-2xl overflow-hidden border border-ink-100 dark:border-ink-700">
          {QR_LOGS.map((entry, i) => {
            const Icon = QR_LOG_ICON[entry.kind];
            const tone = QR_LOG_TONE[entry.kind];
            return (
              <View
                key={entry.id}
                className={`flex-row items-center px-4 py-3 ${
                  i < QR_LOGS.length - 1 ? 'border-b border-ink-100 dark:border-ink-700' : ''
                }`}
              >
                <View
                  className="w-9 h-9 rounded-lg items-center justify-center mr-3"
                  style={{ backgroundColor: tone.bg }}
                >
                  <Icon color={tone.fg} size={18} />
                </View>
                <View className="flex-1 min-w-0">
                  <Text
                    className="text-sm font-semibold text-ink-900 dark:text-white"
                    numberOfLines={1}
                  >
                    {tone.label} — {entry.who}
                  </Text>
                  <Text className="text-[11px] text-ink-500 dark:text-ink-100">
                    {entry.gate} · {entry.when} · {entry.method.toUpperCase()}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <Pressable
          onPress={() =>
            Alert.alert(t('qr.scan'), 'Camera scanning lands in Week 2 with expo-camera.')
          }
          className="mt-4 flex-row items-center justify-center bg-ink-900 dark:bg-ink-700 rounded-2xl py-3"
        >
          <Camera color="#fff" size={18} />
          <Text className="text-white font-semibold ml-2">{t('qr.scan')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({
  Icon,
  label,
  tone,
  bg,
  onPress,
}: {
  Icon: typeof Camera;
  label: string;
  tone: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center bg-white dark:bg-ink-700 rounded-2xl py-3 border border-ink-100 dark:border-ink-700"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mb-1"
        style={{ backgroundColor: bg }}
      >
        <Icon color={tone} size={20} />
      </View>
      <Text className="text-xs font-semibold text-ink-900 dark:text-white">{label}</Text>
    </Pressable>
  );
}
