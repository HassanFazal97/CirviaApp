import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStripe } from '@stripe/stripe-react-native';
import { useApi } from '../src/hooks/useApi';
import { useCartStore } from '../src/stores/cart.store';
import { Order } from '@cirvia/types';
import { formatCents } from '@cirvia/utils';

const DELIVERY_FEE_CENTS = 499;

export default function CheckoutScreen() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { request } = useApi();
  const { itemsByStore, getStoreTotal, clearAll } = useCartStore();

  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(false);

  const items = storeId ? itemsByStore[storeId] ?? [] : [];
  const subtotal = storeId ? getStoreTotal(storeId) : 0;
  const total = subtotal + DELIVERY_FEE_CENTS;

  async function handleCheckout() {
    if (!line1 || !city || !state || !zip) {
      Alert.alert('Missing Address', 'Please fill in all address fields');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty');
      return;
    }

    setLoading(true);
    try {
      const orderPayload = {
        store_id: storeId,
        delivery_address: { line1, city, state, zip, country: 'US' },
        items: items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
      };

      const order = await request<Order & { client_secret: string }>('/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload),
      });

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: order.client_secret,
        merchantDisplayName: 'Cirvia',
      });

      if (initError) {
        throw new Error(initError.message);
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          throw new Error(presentError.message);
        }
        return;
      }

      clearAll();
      router.replace(`/order/${order.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      Alert.alert('Checkout Failed', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>

        <TextInput
          style={styles.input}
          placeholder="Street address"
          value={line1}
          onChangeText={setLine1}
        />
        <TextInput
          style={styles.input}
          placeholder="City"
          value={city}
          onChangeText={setCity}
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="State"
            value={state}
            onChangeText={setState}
            autoCapitalize="characters"
            maxLength={2}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="ZIP code"
            value={zip}
            onChangeText={setZip}
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Order Summary</Text>

        {items.map((item) => (
          <View key={item.product.id} style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {item.product.name} × {item.quantity}
            </Text>
            <Text style={styles.summaryValue}>
              {formatCents(item.product.price_cents * item.quantity)}
            </Text>
          </View>
        ))}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery fee</Text>
          <Text style={styles.summaryValue}>{formatCents(DELIVERY_FEE_CENTS)}</Text>
        </View>

        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCents(total)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.payBtn, loading && styles.payBtnDisabled]}
          onPress={handleCheckout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payBtnText}>Pay {formatCents(total)}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  summaryLabel: { fontSize: 14, color: '#374151' },
  summaryValue: { fontSize: 14, color: '#111' },
  totalRow: { borderBottomWidth: 0, paddingTop: 14 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#111' },
  totalValue: { fontSize: 16, fontWeight: '700', color: '#2563EB' },
  payBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 24 },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
