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
import { Order, OrderStatus, PaginatedResponse } from '@cirvia/types';
import { formatCents } from '@cirvia/utils';

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: '#F59E0B',
  payment_confirmed: '#3B82F6',
  store_accepted: '#3B82F6',
  preparing: '#8B5CF6',
  ready_for_pickup: '#06B6D4',
  in_transit: '#2563EB',
  delivered: '#10B981',
  cancelled: '#EF4444',
  refunded: '#6B7280',
};

export default function OrdersScreen() {
  const router = useRouter();
  const { request } = useApi();

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: () => request<PaginatedResponse<Order>>('/orders'),
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load orders</Text>
      </View>
    );
  }

  const orders = data?.data ?? [];

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Your Orders</Text>
      {orders.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No orders yet</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/order/${item.id}`)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] }]}>
                    {item.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.total}>{formatCents(item.total_cents)}</Text>
                <Text style={styles.date}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
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
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { fontSize: 15, fontWeight: '600', color: '#111' },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontSize: 15, fontWeight: '700', color: '#111' },
  date: { fontSize: 13, color: '#9CA3AF' },
  errorText: { color: '#EF4444', fontSize: 15 },
  emptyText: { color: '#6B7280', fontSize: 15 },
});
