import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { router, Tabs } from 'expo-router';
import { Briefcase, Compass, Home, QrCode, User, Users } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/lib/theme';

const TAB_HEIGHT = 64;

/**
 * Custom tab bar: 5 tabs with a centered gap reserved for the floating
 * action button. Layout left→right (LTR): Home | Community | [FAB slot] |
 * Services | Discover | Profile. RTL mirrors automatically.
 */
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const renderTab = (routeIndex: number) => {
    const route = state.routes[routeIndex];
    if (!route) return null;
    const { options } = descriptors[route.key];
    const isFocused = state.index === routeIndex;
    const tint = isFocused ? colors.brand[500] : colors.ink[400];
    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };
    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : undefined}
        className="flex-1 items-center justify-center"
      >
        {options.tabBarIcon?.({ color: tint, size: 22, focused: isFocused })}
        <Text style={{ color: tint }} className="text-[11px] mt-1">
          {options.title}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      className="flex-row bg-white dark:bg-ink-900 border-t border-ink-100 dark:border-ink-700"
      style={{
        paddingBottom: insets.bottom,
        height: TAB_HEIGHT + insets.bottom,
      }}
    >
      {renderTab(0)}
      {renderTab(1)}
      {/* FAB slot — same flex-1 weight so the 5 tabs distribute evenly with a gap */}
      <View className="flex-1" />
      {renderTab(2)}
      {renderTab(3)}
      {renderTab(4)}
    </View>
  );
}

function CenterFab() {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={() => router.push('/qr')}
      accessibilityRole="button"
      accessibilityLabel="Open QR & access"
      className="absolute self-center items-center justify-center rounded-full bg-brand-500"
      style={{
        bottom: insets.bottom + TAB_HEIGHT / 2 - 32,
        width: 64,
        height: 64,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <QrCode color={colors.white} size={28} />
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <View className="flex-1 bg-white dark:bg-ink-900">
      <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: 'Community',
            tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="services"
          options={{
            title: 'Services',
            tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            title: 'Discover',
            tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          }}
        />
      </Tabs>
      <CenterFab />
    </View>
  );
}
