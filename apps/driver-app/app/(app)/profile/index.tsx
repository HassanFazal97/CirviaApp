import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/stores/auth.store';
import { useDeliveryStore } from '../../../src/stores/delivery.store';
import { useApi } from '../../../src/hooks/useApi';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function ProfileScreen() {
  const router = useRouter();
  const { request } = useApi();

  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const driverStatus = useDeliveryStore((s) => s.driverStatus);
  const setDriverStatus = useDeliveryStore((s) => s.setDriverStatus);
  const activeDelivery = useDeliveryStore((s) => s.activeDelivery);

  const [loggingOut, setLoggingOut] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const isOnline = driverStatus !== 'offline';

  async function handleToggleOnline(value: boolean) {
    if (activeDelivery) {
      Alert.alert('Active Delivery', 'You cannot go offline while on an active delivery.');
      return;
    }

    setTogglingStatus(true);
    try {
      setDriverStatus(value ? 'online' : 'offline');
    } finally {
      setTogglingStatus(false);
    }
  }

  async function handleLogout() {
    if (activeDelivery) {
      Alert.alert(
        'Active Delivery',
        'You have an active delivery. Please complete it before logging out.'
      );
      return;
    }

    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            // Best-effort logout call
            await fetch(`${API_BASE}/api/v1/auth/logout`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }).catch(() => {});
          } finally {
            await clearAuth();
            router.replace('/(auth)/login');
            setLoggingOut(false);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar & Name */}
      <View style={styles.heroSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Online Toggle */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10b981' : '#9ca3af' }]} />
            <Text style={styles.rowLabel}>
              {togglingStatus ? 'Updating...' : isOnline ? 'Online — Accepting Jobs' : 'Offline'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            trackColor={{ false: '#e5e7eb', true: '#a7f3d0' }}
            thumbColor={isOnline ? '#10b981' : '#9ca3af'}
            disabled={togglingStatus || !!activeDelivery}
          />
        </View>
      </View>

      {/* Account Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={18} color="#6b7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>{user?.full_name}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={18} color="#6b7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
        </View>
        {user?.phone && (
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color="#6b7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{user.phone}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <ActivityIndicator color="#ef4444" />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.version}>Cirvia Driver v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827' },
  email: { fontSize: 14, color: '#6b7280' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#9ca3af' },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 1 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: '#fecaca',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
  version: { fontSize: 12, color: '#d1d5db', textAlign: 'center', marginTop: 8 },
});
