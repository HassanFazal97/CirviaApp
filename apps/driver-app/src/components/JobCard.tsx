import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Delivery } from '@cirvia/types';
import { formatCents, haversineKm } from '@cirvia/utils';

interface JobCardProps {
  delivery: Delivery;
  driverLat?: number;
  driverLng?: number;
  onAccept?: (deliveryId: string) => void;
  showAcceptButton?: boolean;
}

export function JobCard({
  delivery,
  driverLat,
  driverLng,
  onAccept,
  showAcceptButton = true,
}: JobCardProps) {
  const distanceToPickup =
    driverLat != null &&
    driverLng != null &&
    delivery.pickup_address.lat != null &&
    delivery.pickup_address.lng != null
      ? haversineKm(
          driverLat,
          driverLng,
          delivery.pickup_address.lat!,
          delivery.pickup_address.lng!
        ).toFixed(1)
      : null;

  const deliveryDistance =
    delivery.distance_km != null
      ? delivery.distance_km.toFixed(1)
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.addressBlock}>
          <Text style={styles.label}>Pickup</Text>
          <Text style={styles.city}>{delivery.pickup_address.city}</Text>
          <Text style={styles.address} numberOfLines={1}>
            {delivery.pickup_address.line1}
          </Text>
        </View>
        <View style={styles.arrow}>
          <Text style={styles.arrowText}>→</Text>
        </View>
        <View style={styles.addressBlock}>
          <Text style={styles.label}>Dropoff</Text>
          <Text style={styles.city}>{delivery.dropoff_address.city}</Text>
          <Text style={styles.address} numberOfLines={1}>
            {delivery.dropoff_address.line1}
          </Text>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Earn</Text>
          <Text style={styles.metaValue}>
            {formatCents(delivery.driver_fee_cents)}
          </Text>
        </View>
        {deliveryDistance && (
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Distance</Text>
            <Text style={styles.metaValue}>{deliveryDistance} km</Text>
          </View>
        )}
        {distanceToPickup && (
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>To pickup</Text>
            <Text style={styles.metaValue}>{distanceToPickup} km</Text>
          </View>
        )}
      </View>

      {showAcceptButton && onAccept && (
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => onAccept(delivery.id)}
        >
          <Text style={styles.acceptText}>Accept Job</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressBlock: {
    flex: 1,
  },
  arrow: {
    paddingHorizontal: 8,
    paddingTop: 18,
  },
  arrowText: {
    fontSize: 20,
    color: '#6b7280',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  city: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  address: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 1,
  },
  meta: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
    marginBottom: 12,
    gap: 16,
  },
  metaItem: {
    alignItems: 'flex-start',
  },
  metaLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  acceptButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
