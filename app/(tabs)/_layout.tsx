import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { brand } from '@/constants/brand';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: brand.accent,
        tabBarInactiveTintColor: brand.textMuted,
        tabBarStyle: {
          backgroundColor: brand.surface,
          borderTopColor: brand.border,
        },
        headerStyle: { backgroundColor: brand.bg },
        headerTintColor: brand.text,
        headerTitleStyle: { color: brand.text, fontWeight: '800', letterSpacing: 1 },
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'MAP',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'EVENTS',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'BOOKINGS',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="chevron.right" color={color} />,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'SHOP',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="cart.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PROFILE',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="chevron.left.forwardslash.chevron.right" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
