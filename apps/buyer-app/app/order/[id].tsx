import { useEffect, useState } from 'react';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MapView, { Marker } from 'react-native-maps';
import { useApi } from '../../src/hooks/useApi';
import { useWebSocket } from '../../src/hooks/useWebSocket';
import { Order, OrderStatus, WsOrderStatusUpdate, WsDriverLocationUpdate } from '@cirvia/types';

const STATUS_STEPS: OrderStatus[] = [
  'pending_payment',
  'payment_confirmed',
  'store_accepted',
  'preparing',
  'ready_for_pickup',
  'in_transit',
  'delivered',
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Pending Payment',
  payment_confirmed: 'Payment Confirmed',
  store_accepted: 'Store Accepted',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for Pickup',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { request } = useApi();
  const queryClient = useQueryClient();
  const { joinRoom, leaveRoom, on } = useWebSocket();

  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => request<Order>(`/orders/${id}`),
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!id) return;
    const room = `order:${id}`;
    joinRoom(room);

    const offStatus = on('order:status_update', (data: unknown) => {
      const update = data as WsOrderStatusUpdate;
      if (update.order_id === id) {
        queryClient.invalidateQueries({ queryKey: ['order', id] });
      }
    });

    const offLocation = on('driver:location_update', (data: unknown) => {
      const update = data as WsDriverLocationUpdate;
      setDriverLocation({ lat: update.lat, lng: update.lng });
    });

    return () => {
      leaveRoom(room);
      offStatus?.();
      offLocation?.();
    };
  }, [id]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Order not found</Text>
      </View>
    );
  }

  const isCancelledOrRefunded = order.status === 'cancelled' || order.status === 'refunded';
  const activeStepIdx = STATUS_STEPS.indexOf(order.status);
  const showMap = order.status === 'in_transit' && driverLocation;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.orderId}>Order #{order.id.slice(0, 8)}</Text>

      {isCancelledOrRefunded ? (
        <View style={[styles.statusBanner, { backgroundColor: '#FEE2E2' }]}>
          <Text style={[styles.statusBannerText, { color: '#EF4444' }]}>
            {STATUS_LABELS[order.status]}
          </Text>
        </View>
      ) : (
        <View style={styles.stepper}>
          {STATUS_STEPS.map((step, idx) => {
            const isCompleted = idx < activeStepIdx;
            const isActive = idx === activeStepIdx;

            return (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepIndicatorCol}>
                  <View
                    style={[
                      styles.stepDot,
                      isCompleted && styles.stepDotCompleted,
                      isActive && styles.stepDotActive,
                    ]}
                  >
                    {isCompleted && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  {idx < STATUS_STEPS.length - 1 && (
                    <View style={[styles.stepLine, isCompleted && styles.stepLineCompleted]} />
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                    isCompleted && styles.stepLabelCompleted,
                  ]}
                >
                  {STATUS_LABELS[step]}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {showMap && driverLocation && (
        <View style={styles.mapContainer}>
          <Text style={styles.mapTitle}>Driver Location</Text>
          <MapView
            style={styles.map}
            region={{
              latitude: driverLocation.lat,
              longitude: driverLocation.lng,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
          >
            <Marker
              coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
              title="Driver"
            />
          </MapView>
        </View>
      )}

      <View style={styles.addressBox}>
        <Text style={styles.addressTitle}>Delivery Address</Text>
        <Text style={styles.addressText}>{order.delivery_address.line1}</Text>
        <Text style={styles.addressText}>
          {order.delivery_address.city}, {order.delivery_address.state} {order.delivery_address.zip}
        </Text>
      </View>

      {order.status === 'delivered' && (
        <TouchableOpacity
          style={styles.reviewBtn}
          onPress={() =>
            Alert.alert('Reviews', 'Review functionality coming soon')
          }
        >
          <Text style={styles.reviewBtnText}>Leave a Review</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  orderId: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 20 },
  statusBanner: { borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 20 },
  statusBannerText: { fontSize: 16, fontWeight: '600' },
  stepper: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  stepIndicatorCol: { alignItems: 'center', marginRight: 14 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotCompleted: { backgroundColor: '#10B981' },
  stepDotActive: { backgroundColor: '#2563EB' },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepLine: { width: 2, height: 28, backgroundColor: '#E5E7EB', marginVertical: 2 },
  stepLineCompleted: { backgroundColor: '#10B981' },
  stepLabel: { fontSize: 14, color: '#9CA3AF', paddingTop: 4, paddingBottom: 30 },
  stepLabelActive: { color: '#2563EB', fontWeight: '600' },
  stepLabelCompleted: { color: '#374151' },
  mapContainer: { borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  mapTitle: { fontSize: 16, fontWeight: '600', color: '#111', marginBottom: 8 },
  map: { width: '100%', height: 220 },
  addressBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  addressTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  addressText: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  reviewBtn: { backgroundColor: '#10B981', borderRadius: 10, padding: 16, alignItems: 'center' },
  reviewBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  errorText: { color: '#EF4444', fontSize: 15 },
});
