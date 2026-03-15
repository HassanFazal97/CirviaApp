import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orderService } from '../services/order.service';
import { productRepository } from '../repositories/product.repository';
import { orderRepository } from '../repositories/order.repository';
import { driverRepository } from '../repositories/driver.repository';
import { userRepository } from '../repositories/user.repository';
import { stripeService } from '../services/stripe.service';
import { emailService } from '../services/email.service';
import { stockRestoreQueue } from '../queues/stock.queue';

vi.mock('../db', () => ({
  supabase: {},
  pool: {
    query: vi.fn().mockResolvedValue({
      rows: [{ store_address: { line1: '123 Store St', city: 'Austin', state: 'TX', zip: '78701', country: 'US' } }],
    }),
  },
}));

vi.mock('../redis', () => ({
  redis: { setex: vi.fn(), get: vi.fn(), del: vi.fn(), set: vi.fn() },
  TTL: { REFRESH_TOKEN: 2592000 },
}));

vi.mock('../repositories/product.repository', () => ({
  productRepository: {
    findById: vi.fn(),
    decrementStock: vi.fn(),
    incrementStock: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  },
}));

vi.mock('../repositories/order.repository', () => ({
  orderRepository: {
    findById: vi.fn(),
    create: vi.fn(),
    createItems: vi.fn(),
    updateStatus: vi.fn(),
    updateStripeStatus: vi.fn(),
    getItems: vi.fn(),
  },
}));

vi.mock('../repositories/driver.repository', () => ({
  driverRepository: {
    createDelivery: vi.fn(),
    findByUserId: vi.fn(),
  },
}));

vi.mock('../repositories/user.repository', () => ({
  userRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../services/stripe.service', () => ({
  stripeService: {
    createPaymentIntent: vi.fn(),
    cancelPaymentIntent: vi.fn(),
  },
}));

vi.mock('../services/email.service', () => ({
  emailService: {
    sendOrderConfirmation: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../queues/stock.queue', () => ({
  stockRestoreQueue: {
    add: vi.fn().mockResolvedValue(undefined),
  },
  stockRestoreWorker: { close: vi.fn(), on: vi.fn() },
}));

const mockProduct = {
  id: 'product-123',
  store_id: 'store-123',
  name: 'Test Widget',
  price_cents: 2500,
  stock: 10,
  is_active: true,
  category: 'Electronics',
  unit: 'each',
  condition: 'new' as const,
  image_urls: [],
  description: null,
  sku: null,
  weight_kg: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
};

const mockOrder = {
  id: 'order-abc',
  buyer_id: 'buyer-id',
  store_id: 'store-123',
  status: 'pending_payment',
  subtotal_cents: 5000,
  delivery_fee_cents: 599,
  platform_fee_cents: 750,
  total_cents: 5599,
  stripe_payment_intent_id: 'pi_test123',
  delivery_address: { line1: '456 Elm', city: 'Austin', state: 'TX', zip: '78702', country: 'US' },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
};

const mockPaymentIntent = {
  id: 'pi_test123',
  client_secret: 'pi_test123_secret_xyz',
  amount: 5599,
  currency: 'usd',
  status: 'requires_payment_method',
};

const deliveryAddress = {
  line1: '456 Elm St',
  city: 'Austin',
  state: 'TX',
  zip: '78702',
  country: 'US',
};

describe('orderService.createOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates order and returns client_secret on success', async () => {
    vi.mocked(productRepository.findById).mockResolvedValue(mockProduct);
    vi.mocked(productRepository.decrementStock).mockResolvedValue(true);
    vi.mocked(stripeService.createPaymentIntent).mockResolvedValue(mockPaymentIntent as any);
    vi.mocked(orderRepository.create).mockResolvedValue(mockOrder as any);
    vi.mocked(orderRepository.createItems).mockResolvedValue([]);
    vi.mocked(userRepository.findById).mockResolvedValue(null);

    const result = await orderService.createOrder({
      buyer_id: 'buyer-id',
      store_id: 'store-123',
      items: [{ product_id: 'product-123', quantity: 2 }],
      delivery_address: deliveryAddress,
    });

    expect(result.order).toEqual(mockOrder);
    expect(result.client_secret).toBe('pi_test123_secret_xyz');
  });

  it('calculates subtotal server-side from product prices', async () => {
    vi.mocked(productRepository.findById).mockResolvedValue(mockProduct); // price_cents: 2500
    vi.mocked(productRepository.decrementStock).mockResolvedValue(true);
    vi.mocked(stripeService.createPaymentIntent).mockResolvedValue(mockPaymentIntent as any);
    vi.mocked(orderRepository.create).mockResolvedValue(mockOrder as any);
    vi.mocked(orderRepository.createItems).mockResolvedValue([]);
    vi.mocked(userRepository.findById).mockResolvedValue(null);

    await orderService.createOrder({
      buyer_id: 'buyer-id',
      store_id: 'store-123',
      items: [{ product_id: 'product-123', quantity: 2 }],
      delivery_address: deliveryAddress,
    });

    // subtotal = 2500 * 2 = 5000
    expect(orderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ subtotal_cents: 5000 })
    );
  });

  it('uses default delivery fee of $5.99 when not specified', async () => {
    vi.mocked(productRepository.findById).mockResolvedValue(mockProduct);
    vi.mocked(productRepository.decrementStock).mockResolvedValue(true);
    vi.mocked(stripeService.createPaymentIntent).mockResolvedValue(mockPaymentIntent as any);
    vi.mocked(orderRepository.create).mockResolvedValue(mockOrder as any);
    vi.mocked(orderRepository.createItems).mockResolvedValue([]);
    vi.mocked(userRepository.findById).mockResolvedValue(null);

    await orderService.createOrder({
      buyer_id: 'buyer-id',
      store_id: 'store-123',
      items: [{ product_id: 'product-123', quantity: 1 }],
      delivery_address: deliveryAddress,
    });

    expect(orderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ delivery_fee_cents: 599 })
    );
  });

  it('calculates platform_fee as 15% of subtotal', async () => {
    vi.mocked(productRepository.findById).mockResolvedValue({ ...mockProduct, price_cents: 10000 });
    vi.mocked(productRepository.decrementStock).mockResolvedValue(true);
    vi.mocked(stripeService.createPaymentIntent).mockResolvedValue(mockPaymentIntent as any);
    vi.mocked(orderRepository.create).mockResolvedValue(mockOrder as any);
    vi.mocked(orderRepository.createItems).mockResolvedValue([]);
    vi.mocked(userRepository.findById).mockResolvedValue(null);

    await orderService.createOrder({
      buyer_id: 'buyer-id',
      store_id: 'store-123',
      items: [{ product_id: 'product-123', quantity: 1 }],
      delivery_address: deliveryAddress,
    });

    expect(orderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ platform_fee_cents: 1500 }) // 15% of 10000
    );
  });

  it('queues stock restore job with 15 min delay', async () => {
    vi.mocked(productRepository.findById).mockResolvedValue(mockProduct);
    vi.mocked(productRepository.decrementStock).mockResolvedValue(true);
    vi.mocked(stripeService.createPaymentIntent).mockResolvedValue(mockPaymentIntent as any);
    vi.mocked(orderRepository.create).mockResolvedValue(mockOrder as any);
    vi.mocked(orderRepository.createItems).mockResolvedValue([]);
    vi.mocked(userRepository.findById).mockResolvedValue(null);

    await orderService.createOrder({
      buyer_id: 'buyer-id',
      store_id: 'store-123',
      items: [{ product_id: 'product-123', quantity: 1 }],
      delivery_address: deliveryAddress,
    });

    expect(stockRestoreQueue.add).toHaveBeenCalledWith(
      'restore-stock-on-timeout',
      expect.objectContaining({ payment_intent_id: 'pi_test123' }),
      { delay: 15 * 60 * 1000 }
    );
  });

  it('throws when product is not found', async () => {
    vi.mocked(productRepository.findById).mockResolvedValue(null);

    await expect(
      orderService.createOrder({
        buyer_id: 'buyer-id',
        store_id: 'store-123',
        items: [{ product_id: 'nonexistent-product', quantity: 1 }],
        delivery_address: deliveryAddress,
      })
    ).rejects.toThrow('Product nonexistent-product not found');
  });

  it('throws when product is inactive', async () => {
    vi.mocked(productRepository.findById).mockResolvedValue({ ...mockProduct, is_active: false });

    await expect(
      orderService.createOrder({
        buyer_id: 'buyer-id',
        store_id: 'store-123',
        items: [{ product_id: 'product-123', quantity: 1 }],
        delivery_address: deliveryAddress,
      })
    ).rejects.toThrow('is no longer available');
  });

  it('throws when product belongs to a different store', async () => {
    vi.mocked(productRepository.findById).mockResolvedValue({
      ...mockProduct,
      store_id: 'different-store',
    });

    await expect(
      orderService.createOrder({
        buyer_id: 'buyer-id',
        store_id: 'store-123',
        items: [{ product_id: 'product-123', quantity: 1 }],
        delivery_address: deliveryAddress,
      })
    ).rejects.toThrow('does not belong to the selected store');
  });

  it('throws and rolls back reserved stock when a product is out of stock', async () => {
    const product1 = { ...mockProduct, id: 'product-1' };
    const product2 = { ...mockProduct, id: 'product-2' };
    vi.mocked(productRepository.findById)
      .mockResolvedValueOnce(product1)
      .mockResolvedValueOnce(product2);

    vi.mocked(productRepository.decrementStock)
      .mockResolvedValueOnce(true) // product-1 reserved
      .mockResolvedValueOnce(false); // product-2 out of stock

    vi.mocked(productRepository.incrementStock).mockResolvedValue(undefined);

    await expect(
      orderService.createOrder({
        buyer_id: 'buyer-id',
        store_id: 'store-123',
        items: [
          { product_id: 'product-1', quantity: 1 },
          { product_id: 'product-2', quantity: 99 },
        ],
        delivery_address: deliveryAddress,
      })
    ).rejects.toThrow('Insufficient stock');

    // product-1 stock should be restored
    expect(productRepository.incrementStock).toHaveBeenCalledWith('product-1', 1);
  });

  it('rolls back all reserved stock when Stripe fails', async () => {
    vi.mocked(productRepository.findById).mockResolvedValue(mockProduct);
    vi.mocked(productRepository.decrementStock).mockResolvedValue(true);
    vi.mocked(stripeService.createPaymentIntent).mockRejectedValue(new Error('Stripe error'));
    vi.mocked(productRepository.incrementStock).mockResolvedValue(undefined);

    await expect(
      orderService.createOrder({
        buyer_id: 'buyer-id',
        store_id: 'store-123',
        items: [{ product_id: 'product-123', quantity: 2 }],
        delivery_address: deliveryAddress,
      })
    ).rejects.toThrow('Stripe error');

    expect(productRepository.incrementStock).toHaveBeenCalledWith('product-123', 2);
  });
});

describe('orderService.confirmPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates stripe status, order status, and creates delivery', async () => {
    vi.mocked(orderRepository.updateStripeStatus).mockResolvedValue(mockOrder as any);
    vi.mocked(orderRepository.updateStatus).mockResolvedValue(mockOrder as any);
    vi.mocked(driverRepository.createDelivery).mockResolvedValue({} as any);

    const { pool } = await import('../db');
    vi.mocked(pool.query).mockResolvedValue({
      rows: [{ store_address: { line1: '123 Store St', city: 'Austin', state: 'TX', zip: '78701', country: 'US' } }],
    } as any);

    await orderService.confirmPayment('pi_test123');

    expect(orderRepository.updateStripeStatus).toHaveBeenCalledWith('pi_test123', 'succeeded');
    expect(orderRepository.updateStatus).toHaveBeenCalledWith(mockOrder.id, 'payment_confirmed');
    expect(driverRepository.createDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ order_id: mockOrder.id })
    );
  });

  it('sets driver_fee_cents to 20% of order total', async () => {
    // total_cents = 5599, 20% = 1119 (rounded)
    vi.mocked(orderRepository.updateStripeStatus).mockResolvedValue(mockOrder as any);
    vi.mocked(orderRepository.updateStatus).mockResolvedValue(mockOrder as any);
    vi.mocked(driverRepository.createDelivery).mockResolvedValue({} as any);

    const { pool } = await import('../db');
    vi.mocked(pool.query).mockResolvedValue({ rows: [{ store_address: null }] } as any);

    await orderService.confirmPayment('pi_test123');

    expect(driverRepository.createDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        driver_fee_cents: Math.round(mockOrder.total_cents * 0.2),
      })
    );
  });

  it('returns null when payment intent not found', async () => {
    vi.mocked(orderRepository.updateStripeStatus).mockResolvedValue(null);

    const result = await orderService.confirmPayment('pi_unknown');

    expect(result).toBeNull();
    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
  });
});

describe('orderService.handlePaymentFailed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks stripe status as failed and cancels the order', async () => {
    vi.mocked(orderRepository.updateStripeStatus).mockResolvedValue(mockOrder as any);
    vi.mocked(orderRepository.updateStatus).mockResolvedValue(mockOrder as any);

    await orderService.handlePaymentFailed('pi_test123');

    expect(orderRepository.updateStripeStatus).toHaveBeenCalledWith('pi_test123', 'failed');
    expect(orderRepository.updateStatus).toHaveBeenCalledWith(mockOrder.id, 'cancelled');
  });

  it('does nothing when payment intent not found', async () => {
    vi.mocked(orderRepository.updateStripeStatus).mockResolvedValue(null);

    await orderService.handlePaymentFailed('pi_unknown');

    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
  });
});
