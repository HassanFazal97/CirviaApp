import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '../src/stores/cart.store';
import { formatCents } from '@cirvia/utils';

export default function CartScreen() {
  const router = useRouter();
  const { itemsByStore, updateQuantity, removeItem, getStoreTotal } = useCartStore();

  const storeIds = Object.keys(itemsByStore);
  const hasMultipleStores = storeIds.length > 1;

  if (storeIds.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>Browse stores to add items</Text>
        <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)')}>
          <Text style={styles.browseBtnText}>Browse Stores</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {hasMultipleStores && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            ⚠️ You have items from multiple stores. Each store requires a separate order.
          </Text>
        </View>
      )}

      <FlatList
        data={storeIds}
        keyExtractor={(id) => id}
        contentContainerStyle={styles.list}
        renderItem={({ item: storeId }) => {
          const items = itemsByStore[storeId];
          const total = getStoreTotal(storeId);

          return (
            <View style={styles.storeSection}>
              <Text style={styles.storeLabel}>Store order</Text>

              {items.map((cartItem) => (
                <View key={cartItem.product.id} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{cartItem.product.name}</Text>
                    <Text style={styles.itemPrice}>{formatCents(cartItem.product.price_cents)}</Text>
                  </View>

                  <View style={styles.qtyControls}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(cartItem.product.id, cartItem.quantity - 1)}
                    >
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{cartItem.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(cartItem.product.id, cartItem.quantity + 1)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeItem(cartItem.product.id)}
                    >
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>Subtotal</Text>
                <Text style={styles.subtotalValue}>{formatCents(total)}</Text>
              </View>

              <TouchableOpacity
                style={styles.checkoutBtn}
                onPress={() => router.push({ pathname: '/checkout', params: { storeId } })}
              >
                <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#6B7280', marginBottom: 24 },
  browseBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  browseBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  warning: { backgroundColor: '#FEF3C7', padding: 14, margin: 16, borderRadius: 10 },
  warningText: { color: '#92400E', fontSize: 14, lineHeight: 20 },
  list: { padding: 16 },
  storeSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  storeLabel: { fontSize: 13, color: '#9CA3AF', fontWeight: '500', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  itemInfo: { flex: 1, marginRight: 12 },
  itemName: { fontSize: 14, fontWeight: '500', color: '#111', marginBottom: 2 },
  itemPrice: { fontSize: 13, color: '#6B7280' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  qtyText: { fontSize: 15, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  removeBtnText: { fontSize: 12, color: '#EF4444' },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  subtotalLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  subtotalValue: { fontSize: 15, fontWeight: '700', color: '#111' },
  checkoutBtn: { backgroundColor: '#2563EB', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 14 },
  checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
