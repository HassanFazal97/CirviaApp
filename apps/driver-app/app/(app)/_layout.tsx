import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDeliveryStore } from '../../src/stores/delivery.store';
import { useSocket } from '../../src/hooks/useSocket';

export default function AppLayout() {
  // Initialize socket connection for the whole app session
  useSocket();

  const activeDelivery = useDeliveryStore((s) => s.activeDelivery);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopColor: '#f3f4f6' },
      }}
    >
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="active"
        options={{
          title: 'Active',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="navigate-outline" size={size} color={color} />
          ),
          tabBarBadge: activeDelivery ? '•' : undefined,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
