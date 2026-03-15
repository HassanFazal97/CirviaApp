import { v4 as uuidv4 } from 'uuid';
import { orderRepository } from '../repositories/order.repository';
import { productRepository } from '../repositories/product.repository';
import { driverRepository } from '../repositories/driver.repository';
import { userRepository } from '../repositories/user.repository';
import { stripeService } from './stripe.service';
import { emailService } from './email.service';
import { stockRestoreQueue } from '../queues/stock.queue';
import { calculatePayoutSplits } from '@cirvia/utils';
import { Address, Order } from '@cirvia/types';

export interface CartItem {
  product_id: string;
  quantity: number;
}

export interface CreateOrderInput {
  buyer_id: string;
  store_id: string;
  items: CartItem[];
  delivery_address: Address;
  delivery_notes?: string;
  delivery_fee_cents?: number;
}

const PLATFORM_FEE_RATE = 0.15;
const DELIVERY_FEE_DEFAULT_CENTS = 599; // $5.99 default

export const orderService = {
  async createOrder(input: CreateOrderInput): Promise<{
    order: Order;
    client_secret: string;
  }> {
    // 1. Load and validate all products
    const productDetails = await Promise.all(
      input.items.map(async (item) => {
        const product = await productRepository.findById(item.product_id);
        if (!product) throw new Error(`Product ${item.product_id} not found`);
        if (!product.is_active) throw new Error(`Product ${product.name} is no longer available`);
        if (product.store_id !== input.store_id) {
          throw new Error(`Product ${product.name} does not belong to the selected store`);
        }
        return { product, quantity: item.quantity };
      })
    );

    // 2. Reserve stock atomically
    const stockReservations: { product_id: string; quantity: number }[] = [];
    for (const { product, quantity } of productDetails) {
      const reserved = await productRepository.decrementStock(product.id, quantity);
      if (!reserved) {
        // Roll back previous reservations
        await Promise.all(
          stockReservations.map(({ product_id, quantity: qty }) =>
            productRepository.incrementStock(product_id, qty)
          )
        );
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      stockReservations.push({ product_id: product.id, quantity });
    }

    // 3. Calculate totals (server-side only — never trust client)
    const subtotal_cents = productDetails.reduce(
      (sum, { product, quantity }) => sum + product.price_cents * quantity,
      0
    );
    const delivery_fee_cents = input.delivery_fee_cents ?? DELIVERY_FEE_DEFAULT_CENTS;
    const platform_fee_cents = Math.round(subtotal_cents * PLATFORM_FEE_RATE);
    const total_cents = subtotal_cents + delivery_fee_cents;

    // 4. Create Stripe PaymentIntent
    const orderId = uuidv4();
    let paymentIntent;
    try {
      paymentIntent = await stripeService.createPaymentIntent(total_cents, 'usd', {
        order_id: orderId,
        buyer_id: input.buyer_id,
        store_id: input.store_id,
      });
    } catch (err) {
      // Roll back stock on Stripe failure
      await Promise.all(
        stockReservations.map(({ product_id, quantity }) =>
          productRepository.incrementStock(product_id, quantity)
        )
      );
      throw err;
    }

    // 5. Persist order + items
    const order = await orderRepository.create({
      id: orderId,
      buyer_id: input.buyer_id,
      store_id: input.store_id,
      delivery_address: input.delivery_address,
      delivery_notes: input.delivery_notes,
      subtotal_cents,
      delivery_fee_cents,
      platform_fee_cents,
      total_cents,
      stripe_payment_intent_id: paymentIntent.id,
    });

    await orderRepository.createItems(
      productDetails.map(({ product, quantity }) => ({
        id: uuidv4(),
        order_id: orderId,
        product_id: product.id,
        quantity,
        unit_price_cents: product.price_cents,
        total_cents: product.price_cents * quantity,
      }))
    );

    // 6. Queue a background job to restore stock if payment isn't confirmed within 15 min
    await stockRestoreQueue.add(
      'restore-stock-on-timeout',
      {
        order_id: orderId,
        payment_intent_id: paymentIntent.id,
        items: stockReservations,
      },
      { delay: 15 * 60 * 1000 }
    );

    // 7. Send confirmation email
    const buyer = await userRepository.findById(input.buyer_id);
    if (buyer) {
      emailService.sendOrderConfirmation(buyer, order).catch(() => {});
    }

    return {
      order,
      client_secret: paymentIntent.client_secret!,
    };
  },

  /** Called by Stripe webhook on payment_intent.succeeded */
  async confirmPayment(paymentIntentId: string): Promise<Order | null> {
    const order = await orderRepository.updateStripeStatus(paymentIntentId, 'succeeded');
    if (!order) return null;

    await orderRepository.updateStatus(order.id, 'payment_confirmed');

    // Create a pending delivery record
    const { driver, store } = await this._getOrderContext(order.id);
    const splits = calculatePayoutSplits(order.total_cents);

    await driverRepository.createDelivery({
      id: uuidv4(),
      order_id: order.id,
      pickup_address: store ?? order.delivery_address,
      dropoff_address: order.delivery_address,
      driver_fee_cents: splits.driver,
    });

    return order;
  },

  /** Called by Stripe webhook on payment_intent.payment_failed */
  async handlePaymentFailed(paymentIntentId: string): Promise<void> {
    const order = await orderRepository.updateStripeStatus(paymentIntentId, 'failed');
    if (!order) return;
    await orderRepository.updateStatus(order.id, 'cancelled');
    // Stock restore is handled by the BullMQ job already queued
  },

  async _getOrderContext(orderId: string) {
    const { pool } = await import('../db');
    const { rows } = await pool.query(
      'SELECT s.address as store_address FROM orders o JOIN stores s ON s.id = o.store_id WHERE o.id = $1',
      [orderId]
    );
    return { driver: null, store: rows[0]?.store_address ?? null };
  },
};
