import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { DeliveryStatus } from '@cirvia/types';

interface StatusButtonProps {
  currentStatus: DeliveryStatus;
  onPress: (nextStatus: DeliveryStatus) => void;
  loading?: boolean;
}

const STATUS_TRANSITIONS: Partial<Record<DeliveryStatus, { next: DeliveryStatus; label: string }>> = {
  assigned: { next: 'en_route_to_store', label: 'Start Route to Store' },
  en_route_to_store: { next: 'at_store', label: "I'm at the Store" },
  at_store: { next: 'picked_up', label: "I've Picked Up the Order" },
  picked_up: { next: 'in_transit', label: 'In Transit' },
  in_transit: { next: 'delivered', label: 'Mark as Delivered' },
};

export function StatusButton({ currentStatus, onPress, loading = false }: StatusButtonProps) {
  const transition = STATUS_TRANSITIONS[currentStatus];

  if (!transition) return null;

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => onPress(transition.next)}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.label}>{transition.label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
