import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../../../src/hooks/useApi';
import { useDeliveryStore } from '../../../src/stores/delivery.store';
import { JobCard } from '../../../src/components/JobCard';
import type { Delivery } from '@cirvia/types';

interface AvailableDeliveriesResponse {
  data: Delivery[];
}

export default function JobsScreen() {
  const router = useRouter();
  const { request } = useApi();
  const driverStatus = useDeliveryStore((s) => s.driverStatus);
  const setDriverStatus = useDeliveryStore((s) => s.setDriverStatus);
  const activeDelivery = useDeliveryStore((s) => s.activeDelivery);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission is required to find nearby jobs.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<AvailableDeliveriesResponse>({
    queryKey: ['available-deliveries', coords?.lat, coords?.lng],
    queryFn: () =>
      request<AvailableDeliveriesResponse>(
        `/drivers/deliveries/available?lat=${coords!.lat}&lng=${coords!.lng}`
      ),
    enabled: !!coords && driverStatus !== 'offline',
    refetchInterval: 30_000,
  });

  const deliveries = data?.data ?? [];

  function toggleOnlineStatus() {
    setDriverStatus(driverStatus === 'offline' ? 'online' : 'offline');
  }

  if (activeDelivery) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="navigate" size={48} color="#4f46e5" />
        <Text style={styles.infoTitle}>Active Delivery in Progress</Text>
        <Text style={styles.infoSubtitle}>You have an active delivery. Go to the Active tab to continue.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(app)/active')}
        >
          <Text style={styles.buttonText}>Go to Active Delivery</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Online/Offline Toggle */}
      <View style={styles.statusBar}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: driverStatus === 'offline' ? '#9ca3af' : '#10b981' }]} />
          <Text style={styles.statusText}>
            {driverStatus === 'offline' ? 'Offline' : 'Online — Looking for jobs'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.toggleButton, driverStatus !== 'offline' && styles.toggleButtonActive]}
          onPress={toggleOnlineStatus}
        >
          <Text style={styles.toggleText}>
            {driverStatus === 'offline' ? 'Go Online' : 'Go Offline'}
          </Text>
        </TouchableOpacity>
      </View>

      {locationError && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={16} color="#ef4444" />
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}

      {driverStatus === 'offline' ? (
        <View style={styles.centerContainer}>
          <Ionicons name="moon-outline" size={48} color="#9ca3af" />
          <Text style={styles.infoTitle}>You're Offline</Text>
          <Text style={styles.infoSubtitle}>Go online to see available delivery jobs near you.</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.infoSubtitle}>Finding jobs near you...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.infoTitle}>Failed to load jobs</Text>
          <TouchableOpacity style={styles.button} onPress={() => refetch()}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={deliveries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/(app)/jobs/${item.id}`)}>
              <JobCard
                delivery={item}
                driverLat={coords?.lat}
                driverLng={coords?.lng}
                showAcceptButton={false}
              />
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="search-outline" size={48} color="#9ca3af" />
              <Text style={styles.infoTitle}>No Jobs Nearby</Text>
              <Text style={styles.infoSubtitle}>No deliveries available within 5 km. Pull down to refresh.</Text>
            </View>
          }
          contentContainerStyle={deliveries.length === 0 ? styles.flex : styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#10b981',
  },
  toggleButtonActive: {
    backgroundColor: '#ef4444',
  },
  toggleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  infoSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: { paddingVertical: 8 },
});
