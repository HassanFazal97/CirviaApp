import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../src/hooks/useApi';
import { useCartStore } from '../../src/stores/cart.store';
import { Store, Product, PaginatedResponse } from '@cirvia/types';
import { formatCents } from '@cirvia/utils';

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { request } = useApi();
  const itemCount = useCartStore((s) => s.getItemCount());

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ['store', id],
    queryFn: () => request<Store>(`/stores/${id}`),
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['store-products', id],
    queryFn: () => request<PaginatedResponse<Product>>(`/stores/${id}/products`),
  });

  if (storeLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const products = productsData?.data ?? [];

  return (
    <View style={styles.container}>
      {store && (
        <View style={styles.storeHeader}>
          <Text style={styles.storeName}>{store.name}</Text>
          {store.description && (
            <Text style={styles.storeDesc}>{store.description}</Text>
          )}
          <Text style={styles.storeAddress}>
            {store.address.line1}, {store.address.city}
          </Text>
        </View>
      )}

      <View style={styles.productsHeader}>
        <Text style={styles.sectionTitle}>Products</Text>
        {itemCount > 0 && (
          <TouchableOpacity style={styles.cartBtn} onPress={() => router.push('/cart')}>
            <Text style={styles.cartBtnText}>Cart ({itemCount})</Text>
          </TouchableOpacity>
        )}
      </View>

      {productsLoading ? (
        <ActivityIndicator color="#2563EB" style={{ marginTop: 24 }} />
      ) : products.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No products available</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => router.push(`/product/${item.id}`)}
            >
              <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.productPrice}>{formatCents(item.price_cents)}</Text>
              <View style={styles.conditionBadge}>
                <Text style={styles.conditionText}>{item.condition}</Text>
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
  storeHeader: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
  storeName: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 4 },
  storeDesc: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  storeAddress: { fontSize: 13, color: '#9CA3AF' },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111' },
  cartBtn: { backgroundColor: '#2563EB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  cartBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  grid: { paddingHorizontal: 12, paddingBottom: 24 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    width: '48%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  productName: { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 6 },
  productPrice: { fontSize: 15, color: '#2563EB', fontWeight: '700', marginBottom: 6 },
  conditionBadge: { backgroundColor: '#F3F4F6', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  conditionText: { fontSize: 11, color: '#6B7280', textTransform: 'capitalize' },
  emptyText: { color: '#6B7280', fontSize: 15 },
});
