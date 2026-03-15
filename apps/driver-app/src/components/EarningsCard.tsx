import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface EarningsCardProps {
  label: string;
  value: string;
  icon?: string;
  accent?: string;
}

export function EarningsCard({ label, value, icon, accent = '#4f46e5' }: EarningsCardProps) {
  return (
    <View style={styles.card}>
      {icon && (
        <Text style={[styles.icon, { color: accent }]}>{icon}</Text>
      )}
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    flex: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  icon: {
    fontSize: 28,
    marginBottom: 8,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
});
