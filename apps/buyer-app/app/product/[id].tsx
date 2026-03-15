import { useState } from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../src/hooks/useApi';
import { useCartStore } from '../../src/stores/cart.store';
import { Product } from '@cirvia/types';
import { formatCents } from '@cirvia/utils';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { request } = useApi();
  const addItem = useCartStore((s) => s.addItem);
  const itemCount = useCartStore((s) => s.getItemCount());
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => request<Product>(`/products/${id}`),
  });

  function handleAddToCart() {
    if (!product) return;
    addItem(product, quantity);
    Alert.alert('Added to Cart', `${product.name} x${quantity} added`, [
      { text: 'Continue Shopping' },
      { text: 'View Cart', onPress: () => router.push('/cart') },
    ]);
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Product not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>📦</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.productName}>{product.name}</Text>
            <View style={styles.conditionBadge}>
              <Text style={styles.conditionText}>{product.condition}</Text>
            </View>
          </View>

          <Text style={styles.price}>{formatCents(product.price_cents)}</Text>

          {product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}

          <Text style={styles.stock}>
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </Text>

          {product.weight_kg && (
            <Text style={styles.meta}>Weight: {product.weight_kg} kg</Text>
          )}
        </View>
      </ScrollView>

      {product.stock > 0 && (
        <View style={styles.footer}>
          <View style={styles.quantityRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity((q) => Math.min(product.stock, q + 1))}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={handleAddToCart}>
            <Text style={styles.addBtnText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      )}

      {itemCount > 0 && (
        <TouchableOpacity style={styles.cartFab} onPress={() => router.push('/cart')}>
          <Text style={styles.cartFabText}>🛒 {itemCount}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 120 },
  imagePlaceholder: {
    height: 220,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: { fontSize: 60 },
  content: { padding: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  productName: { fontSize: 22, fontWeight: '700', color: '#111', flex: 1, marginRight: 8 },
  conditionBadge: { backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  conditionText: { fontSize: 12, color: '#2563EB', fontWeight: '500', textTransform: 'capitalize' },
  price: { fontSize: 26, fontWeight: '800', color: '#2563EB', marginBottom: 16 },
  description: { fontSize: 15, color: '#374151', lineHeight: 22, marginBottom: 12 },
  stock: { fontSize: 14, color: '#10B981', fontWeight: '500', marginBottom: 6 },
  meta: { fontSize: 13, color: '#9CA3AF' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: { fontSize: 20, fontWeight: '600', color: '#111' },
  qtyText: { fontSize: 18, fontWeight: '700', color: '#111', minWidth: 24, textAlign: 'center' },
  addBtn: { flex: 1, backgroundColor: '#2563EB', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cartFab: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#2563EB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cartFabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  errorText: { color: '#EF4444', fontSize: 15 },
});
