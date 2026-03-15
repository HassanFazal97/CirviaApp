import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../../../src/hooks/useApi';
import { EarningsCard } from '../../../src/components/EarningsCard';
import { formatCents } from '@cirvia/utils';

interface EarningsResponse {
  total_deliveries: number;
  total_earned_cents: number;
  last_7_days_cents: number;
  last_30_days_cents: number;
}

export default function EarningsScreen() {
  const { request } = useApi();

  const { data, isLoading, error, refetch, isRefetching } = useQuery<EarningsResponse>({
    queryKey: ['earnings'],
    queryFn: () => request<EarningsResponse>('/drivers/earnings'),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>Could not load earnings</Text>
        <TouchableOpacity style={styles.button} onPress={() => refetch()}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.cardRow}>
        <EarningsCard
          icon="🚗"
          label="Total Deliveries"
          value={String(data?.total_deliveries ?? 0)}
        />
        <EarningsCard
          icon="💰"
          label="Total Earned"
          value={formatCents(data?.total_earned_cents ?? 0)}
          accent="#10b981"
        />
      </View>

      <Text style={styles.sectionTitle}>Recent</Text>
      <View style={styles.cardRow}>
        <EarningsCard
          icon="📅"
          label="Last 7 Days"
          value={formatCents(data?.last_7_days_cents ?? 0)}
          accent="#0ea5e9"
        />
        <EarningsCard
          icon="🗓️"
          label="Last 30 Days"
          value={formatCents(data?.last_30_days_cents ?? 0)}
          accent="#8b5cf6"
        />
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
        <Text style={styles.infoText}>
          You earn 20% of each order total. Payouts are processed automatically via Stripe.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
  },
  cardRow: { flexDirection: 'row', gap: 12 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  errorTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  button: {
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
