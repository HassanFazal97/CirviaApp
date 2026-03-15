import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../../../src/hooks/useApi';
import { useDeliveryStore } from '../../../src/stores/delivery.store';
import { DeliveryMap } from '../../../src/components/DeliveryMap';
import { formatCents } from '@cirvia/utils';
import type { Delivery } from '@cirvia/types';

interface DeliveryDetailResponse {
  data: Delivery;
}

interface AcceptResponse {
  delivery: Delivery;
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { request } = useApi();
  const queryClient = useQueryClient();
  const setActiveDelivery = useDeliveryStore((s) => s.setActiveDelivery);

  const { data, isLoading, error } = useQuery<DeliveryDetailResponse>({
    queryKey: ['delivery', id],
    queryFn: async () => {
      // Use the cached available list if possible, otherwise re-fetch without coords
      const res = await request<{ data: Delivery[] }>(`/drivers/deliveries/available?lat=0&lng=0&radius=100000`);
      const delivery = res.data?.find((d) => d.id === id);
      if (!delivery) throw new Error('Delivery not found or no longer available');
      return { data: delivery };
    },
    enabled: !!id,
  });

  const acceptMutation = useMutation({
    mutationFn: () =>
      request<AcceptResponse>(`/drivers/deliveries/${id}/accept`, { method: 'POST' }),
    onSuccess: ({ delivery }) => {
      setActiveDelivery(delivery);
      queryClient.invalidateQueries({ queryKey: ['available-deliveries'] });
      router.replace('/(app)/active');
    },
    onError: (err: Error) => {
      Alert.alert(
        'Could Not Accept',
        err.message === 'Delivery is already being accepted by another driver'
          ? 'Another driver grabbed this job first. Try another one!'
          : err.message
      );
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (error || !data?.data) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>Could not load job details.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const delivery = data.data;
  const pickupCoords =
    delivery.pickup_address.lat != null && delivery.pickup_address.lng != null
      ? { lat: delivery.pickup_address.lat!, lng: delivery.pickup_address.lng! }
      : null;
  const dropoffCoords =
    delivery.dropoff_address.lat != null && delivery.dropoff_address.lng != null
      ? { lat: delivery.dropoff_address.lat!, lng: delivery.dropoff_address.lng! }
      : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {(pickupCoords || dropoffCoords) && (
        <DeliveryMap
          pickupCoords={pickupCoords}
          dropoffCoords={dropoffCoords}
          style={styles.map}
        />
      )}

      <View style={styles.card}>
        <View style={styles.addressRow}>
          <View style={styles.addressIcon}>
            <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
          </View>
          <View style={styles.addressInfo}>
            <Text style={styles.addressLabel}>Pickup</Text>
            <Text style={styles.addressLine1}>{delivery.pickup_address.line1}</Text>
            <Text style={styles.addressCity}>
              {delivery.pickup_address.city}, {delivery.pickup_address.state}
            </Text>
          </View>
        </View>

        <View style={styles.connector} />

        <View style={styles.addressRow}>
          <View style={styles.addressIcon}>
            <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
          </View>
          <View style={styles.addressInfo}>
            <Text style={styles.addressLabel}>Dropoff</Text>
            <Text style={styles.addressLine1}>{delivery.dropoff_address.line1}</Text>
            <Text style={styles.addressCity}>
              {delivery.dropoff_address.city}, {delivery.dropoff_address.state}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{formatCents(delivery.driver_fee_cents)}</Text>
          <Text style={styles.metricLabel}>You Earn</Text>
        </View>
        {delivery.distance_km != null && (
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{delivery.distance_km.toFixed(1)} km</Text>
            <Text style={styles.metricLabel}>Distance</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.acceptButton, acceptMutation.isPending && styles.acceptButtonDisabled]}
        onPress={() => acceptMutation.mutate()}
        disabled={acceptMutation.isPending}
      >
        {acceptMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
            <Text style={styles.acceptText}>Accept This Job</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  map: { height: 240, borderRadius: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  addressIcon: {
    width: 24,
    alignItems: 'center',
    paddingTop: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  connector: {
    width: 2,
    height: 20,
    backgroundColor: '#e5e7eb',
    marginLeft: 11,
    marginVertical: 4,
  },
  addressInfo: { flex: 1 },
  addressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  addressLine1: { fontSize: 15, fontWeight: '600', color: '#111827' },
  addressCity: { fontSize: 13, color: '#6b7280', marginTop: 1 },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metric: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  metricValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  metricLabel: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  acceptButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptButtonDisabled: { opacity: 0.7 },
  acceptText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  backLink: { fontSize: 14, color: '#4f46e5', fontWeight: '600' },
});
