import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../../../src/hooks/useApi';
import { useDeliveryStore } from '../../../src/stores/delivery.store';
import { useSocket } from '../../../src/hooks/useSocket';
import { useLocationTracking } from '../../../src/hooks/useLocationTracking';
import { DeliveryMap } from '../../../src/components/DeliveryMap';
import { StatusButton } from '../../../src/components/StatusButton';
import { formatCents } from '@cirvia/utils';
import type { Delivery, DeliveryStatus } from '@cirvia/types';

interface StatusUpdateResponse {
  delivery: Delivery;
}

export default function ActiveDeliveryScreen() {
  const router = useRouter();
  const { request } = useApi();
  const queryClient = useQueryClient();
  const socket = useSocket();

  const activeDelivery = useDeliveryStore((s) => s.activeDelivery);
  const setActiveDelivery = useDeliveryStore((s) => s.setActiveDelivery);
  const clearDelivery = useDeliveryStore((s) => s.clearDelivery);

  const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Live GPS tracking — emits to socket every 5s
  useLocationTracking(socket, activeDelivery?.id ?? null, !!activeDelivery);

  // Also update local map coords
  React.useEffect(() => {
    if (!activeDelivery) return;
    const interval = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setDriverCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [activeDelivery]);

  const statusMutation = useMutation({
    mutationFn: (nextStatus: DeliveryStatus) =>
      request<StatusUpdateResponse>(
        `/drivers/deliveries/${activeDelivery!.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus }),
        }
      ),
    onSuccess: ({ delivery }) => {
      if (delivery.status === 'delivered') {
        clearDelivery();
        queryClient.invalidateQueries({ queryKey: ['available-deliveries'] });
        queryClient.invalidateQueries({ queryKey: ['earnings'] });
        Alert.alert('Delivery Complete!', 'Great work! Your earnings have been updated.', [
          { text: 'OK', onPress: () => router.replace('/(app)/jobs') },
        ]);
      } else {
        setActiveDelivery(delivery);
      }
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message);
    },
  });

  if (!activeDelivery) {
    return (
      <View style={styles.center}>
        <Ionicons name="checkmark-circle-outline" size={64} color="#10b981" />
        <Text style={styles.emptyTitle}>No Active Delivery</Text>
        <Text style={styles.emptySubtitle}>Accept a job from the Jobs tab to get started.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/(app)/jobs')}>
          <Text style={styles.buttonText}>Find Jobs</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pickupCoords =
    activeDelivery.pickup_address.lat != null && activeDelivery.pickup_address.lng != null
      ? { lat: activeDelivery.pickup_address.lat!, lng: activeDelivery.pickup_address.lng! }
      : null;
  const dropoffCoords =
    activeDelivery.dropoff_address.lat != null && activeDelivery.dropoff_address.lng != null
      ? { lat: activeDelivery.dropoff_address.lat!, lng: activeDelivery.dropoff_address.lng! }
      : null;

  const statusLabels: Record<DeliveryStatus, string> = {
    pending: 'Pending',
    assigned: 'Assigned',
    en_route_to_store: 'En Route to Store',
    at_store: 'At Store',
    picked_up: 'Order Picked Up',
    in_transit: 'In Transit',
    delivered: 'Delivered',
    failed: 'Failed',
  };

  return (
    <SafeAreaView style={styles.container}>
      <DeliveryMap
        driverCoords={driverCoords}
        pickupCoords={pickupCoords}
        dropoffCoords={dropoffCoords}
        style={styles.map}
      />

      <View style={styles.panel}>
        {/* Status badge */}
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            {statusLabels[activeDelivery.status] ?? activeDelivery.status}
          </Text>
        </View>

        {/* Addresses */}
        <View style={styles.addressCard}>
          <Text style={styles.addressLabel}>Pickup</Text>
          <Text style={styles.addressText}>
            {activeDelivery.pickup_address.line1}, {activeDelivery.pickup_address.city}
          </Text>
          <View style={styles.divider} />
          <Text style={styles.addressLabel}>Dropoff</Text>
          <Text style={styles.addressText}>
            {activeDelivery.dropoff_address.line1}, {activeDelivery.dropoff_address.city}
          </Text>
        </View>

        {/* Earning */}
        <Text style={styles.earning}>
          Earning: {formatCents(activeDelivery.driver_fee_cents)}
        </Text>

        {/* Proof photo button when status is picked_up */}
        {activeDelivery.status === 'picked_up' && (
          <TouchableOpacity
            style={styles.proofButton}
            onPress={() => router.push('/(app)/active/proof')}
          >
            <Ionicons name="camera-outline" size={20} color="#fff" />
            <Text style={styles.proofText}>Add Proof Photo</Text>
          </TouchableOpacity>
        )}

        <StatusButton
          currentStatus={activeDelivery.status}
          onPress={(next) => statusMutation.mutate(next)}
          loading={statusMutation.isPending}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  map: { flex: 1, borderRadius: 0 },
  panel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4f46e5',
  },
  statusText: { fontSize: 13, fontWeight: '700', color: '#4f46e5' },
  addressCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 6 },
  earning: { fontSize: 15, fontWeight: '700', color: '#10b981', textAlign: 'center' },
  proofButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0ea5e9',
    borderRadius: 10,
    paddingVertical: 14,
    marginHorizontal: 16,
  },
  proofText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  emptySubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  button: {
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
