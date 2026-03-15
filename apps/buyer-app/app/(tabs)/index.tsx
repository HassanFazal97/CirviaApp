import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../src/hooks/useApi';
import { useLocation } from '../../src/hooks/useLocation';
import { StoreWithDistance, PaginatedResponse } from '@cirvia/types';
import { haversineKm } from '@cirvia/utils';

export default function HomeScreen() {
  const router = useRouter();
  const { request } = useApi();
  const { lat, lng, loading: locationLoading, error: locationError } = useLocation();

  const { data, isLoading, error } = useQuery({
    queryKey: ['nearby-stores', lat, lng],
    enabled: lat !== null && lng !== null,
    queryFn: () =>
      request<PaginatedResponse<StoreWithDistance>>(
        `/stores/nearby?lat=${lat}&lng=${lng}&radius=10000`
      ),
  });

  if (locationLoading || isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>
          {locationLoading ? 'Getting your location...' : 'Loading nearby stores...'}
        </Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{locationError}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load stores</Text>
      </View>
    );
  }

  const stores = data?.data ?? [];

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Nearby Stores</Text>
      {stores.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No stores found nearby</Text>
        </View>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const distKm = lat && lng
              ? haversineKm(lat, lng, item.lat, item.lng)
              : null;

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/store/${item.id}`)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.storeName}>{item.name}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.type}</Text>
                  </View>
                </View>
                <Text style={styles.storeAddress}>{item.address.line1}, {item.address.city}</Text>
                {distKm !== null && (
                  <Text style={styles.distance}>{distKm.toFixed(1)} km away</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  heading: { fontSize: 22, fontWeight: '700', padding: 16, color: '#111' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  storeName: { fontSize: 16, fontWeight: '600', color: '#111', flex: 1 },
  badge: { backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#2563EB', fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  storeAddress: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  distance: { fontSize: 13, color: '#2563EB', fontWeight: '500' },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 15 },
  errorText: { color: '#EF4444', fontSize: 15, textAlign: 'center' },
  emptyText: { color: '#6B7280', fontSize: 15 },
});
