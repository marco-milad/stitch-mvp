import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { router, Tabs } from 'expo-router';
import { Briefcase, Compass, Home, QrCode, User, Users } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/lib/theme';

const TAB_HEIGHT = 60;
const FAB_SIZE = 56;

/**
 * Custom tab bar: 5 tabs + a wider center slot for the floating action button.
 * Layout LTR: Home | Community | [FAB slot — flex 1.3] | Services | Discover | Profile.
 *
 * The FAB lives INSIDE the FAB slot (not absolute-positioned at screen center),
 * so it never overlaps adjacent tabs — RTL flips automatically with flex-row.
 * Labels are 10px, single-line, with adjustsFontSizeToFit so "Community" and
 * "Services" never wrap.
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
        className="flex-1 items-center justify-center px-1"
        style={{ minWidth: 0 }}
      >
        {options.tabBarIcon?.({ color: tint, size: 20, focused: isFocused })}
        <Text
          style={{ color: tint, fontSize: 10, marginTop: 2 }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
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
      {/*
        FAB slot — slightly wider (flex 1.3) so the FAB has breathing room.
        Items centered horizontally; FAB itself uses negative marginTop to rise
        above the tab-bar baseline. No absolute positioning, no overlap.
      */}
      <View className="items-center justify-center" style={{ flex: 1.3 }}>
        <Pressable
          onPress={() => router.push('/qr')}
          accessibilityRole="button"
          accessibilityLabel="Open QR & access"
          className="rounded-full bg-brand-500 items-center justify-center"
          style={{
            width: FAB_SIZE,
            height: FAB_SIZE,
            marginTop: -FAB_SIZE / 2 - 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <QrCode color={colors.white} size={26} />
        </Pressable>
      </View>
      {renderTab(2)}
      {renderTab(3)}
      {renderTab(4)}
    </View>
  );
}

export default function TabsLayout() {
  return (
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
  );
}
