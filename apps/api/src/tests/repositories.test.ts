import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pool } from '../db';

vi.mock('../db', () => ({
  pool: { query: vi.fn() },
}));

import { userRepository } from '../repositories/user.repository';
import { storeRepository } from '../repositories/store.repository';
import { productRepository } from '../repositories/product.repository';
import { orderRepository } from '../repositories/order.repository';
import { driverRepository } from '../repositories/driver.repository';
import { reviewRepository } from '../repositories/review.repository';
import { payoutRepository } from '../repositories/payout.repository';

const mockPool = pool as { query: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── User Repository ─────────────────────────────────────────────────────────

describe('userRepository', () => {
  const mockUser = {
    id: 'user-123',
    email: 'user@test.com',
    full_name: 'Test User',
    role: 'buyer',
    phone: null,
    avatar_url: null,
    push_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  describe('findById', () => {
    it('returns user when found', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      const result = await userRepository.findById('user-123');

      expect(result).toEqual(mockUser);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
        ['user-123']
      );
    });

    it('returns null when user not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await userRepository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('returns user when found by email', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      const result = await userRepository.findByEmail('user@test.com');

      expect(result).toEqual(mockUser);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
        ['user@test.com']
      );
    });

    it('returns null when no user matches email', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await userRepository.findByEmail('nope@test.com');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('inserts user and returns created row', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      const result = await userRepository.create({
        id: 'user-123',
        email: 'user@test.com',
        full_name: 'Test User',
        role: 'buyer',
      });

      expect(result).toEqual(mockUser);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['user-123', 'user@test.com', 'Test User', 'buyer'])
      );
    });

    it('passes null for optional fields when omitted', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      await userRepository.create({
        id: 'user-123',
        email: 'user@test.com',
        full_name: 'Test User',
        role: 'buyer',
      });

      const [, params] = mockPool.query.mock.calls[0];
      expect(params[4]).toBeNull(); // phone
      expect(params[5]).toBeNull(); // avatar_url
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      const updated = { ...mockUser, full_name: 'Updated Name' };
      mockPool.query.mockResolvedValue({ rows: [updated] });

      const result = await userRepository.update('user-123', { full_name: 'Updated Name' });

      expect(result).toEqual(updated);
      const [sql] = mockPool.query.mock.calls[0];
      expect(sql).toContain('full_name');
      expect(sql).not.toContain('phone');
    });

    it('calls findById when no fields are provided', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      await userRepository.update('user-123', {});

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
        ['user-123']
      );
    });

    it('updates push_token', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ ...mockUser, push_token: 'expo-token-xyz' }] });

      const result = await userRepository.update('user-123', { push_token: 'expo-token-xyz' });

      const [sql] = mockPool.query.mock.calls[0];
      expect(sql).toContain('push_token');
      expect(result?.push_token).toBe('expo-token-xyz');
    });
  });
});

// ─── Store Repository ─────────────────────────────────────────────────────────

describe('storeRepository', () => {
  const mockStore = {
    id: 'store-123',
    owner_id: 'owner-id',
    type: 'retail',
    name: 'Test Store',
    description: null,
    lat: 30.2672,
    lng: -97.7431,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  describe('findById', () => {
    it('returns store when found', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockStore] });

      const result = await storeRepository.findById('store-123');

      expect(result).toEqual(mockStore);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM stores WHERE id = $1 AND deleted_at IS NULL',
        ['store-123']
      );
    });

    it('returns null when not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      expect(await storeRepository.findById('nonexistent')).toBeNull();
    });
  });

  describe('findNearby', () => {
    it('uses PostGIS ST_DWithin for radius search', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await storeRepository.findNearby(30.27, -97.74, 5000, 10, 0);

      const [sql, params] = mockPool.query.mock.calls[0];
      expect(sql).toContain('ST_DWithin');
      expect(params).toEqual([30.27, -97.74, 5000, 10, 0]);
    });

    it('returns stores ordered by distance', async () => {
      const nearStore = { ...mockStore, distance_meters: 100 };
      const farStore = { ...mockStore, id: 'store-456', distance_meters: 4000 };
      mockPool.query.mockResolvedValue({ rows: [nearStore, farStore] });

      const result = await storeRepository.findNearby(30.27, -97.74, 5000);

      expect(result[0].distance_meters).toBe(100);
    });
  });

  describe('create', () => {
    it('inserts store with PostGIS geography point', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockStore] });

      await storeRepository.create({
        id: 'store-123',
        owner_id: 'owner-id',
        type: 'retail',
        name: 'Test Store',
        address: { line1: '123 Main', city: 'Austin', state: 'TX', zip: '78701', country: 'US' },
        lat: 30.2672,
        lng: -97.7431,
      });

      const [sql] = mockPool.query.mock.calls[0];
      expect(sql).toContain('ST_SetSRID(ST_MakePoint');
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ ...mockStore, name: 'New Name' }] });

      await storeRepository.update('store-123', { name: 'New Name' });

      const [sql] = mockPool.query.mock.calls[0];
      expect(sql).toContain('name');
      expect(sql).not.toContain('is_active');
    });

    it('returns null when store not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await storeRepository.update('nonexistent', { name: 'X' });

      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('sets deleted_at to NOW()', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await storeRepository.softDelete('store-123');

      const [sql, params] = mockPool.query.mock.calls[0];
      expect(sql).toContain('deleted_at = NOW()');
      expect(params).toEqual(['store-123']);
    });
  });
});

// ─── Product Repository ───────────────────────────────────────────────────────

describe('productRepository', () => {
  const mockProduct = {
    id: 'product-123',
    store_id: 'store-123',
    name: 'Test Product',
    category: 'Electronics',
    unit: 'each',
    price_cents: 2999,
    stock: 10,
    image_urls: [],
    condition: 'new',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  describe('findById', () => {
    it('returns product filtering by deleted_at', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockProduct] });

      await productRepository.findById('product-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL',
        ['product-123']
      );
    });
  });

  describe('listByStore', () => {
    it('returns paginated products with total count', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockProduct] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] });

      const result = await productRepository.listByStore('store-123', { limit: 10, offset: 0 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(5);
    });
  });

  describe('create', () => {
    it('serializes image_urls as JSON', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockProduct] });

      await productRepository.create({
        id: 'product-123',
        store_id: 'store-123',
        name: 'Test Product',
        category: 'Electronics',
        unit: 'each',
        price_cents: 2999,
        stock: 10,
        image_urls: ['https://example.com/img1.jpg'],
      });

      const [, params] = mockPool.query.mock.calls[0];
      expect(params[9]).toBe('["https://example.com/img1.jpg"]');
    });

    it('defaults condition to new', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockProduct] });

      await productRepository.create({
        id: 'product-123',
        store_id: 'store-123',
        name: 'Test Product',
        category: 'Electronics',
        unit: 'each',
        price_cents: 2999,
        stock: 10,
      });

      const [, params] = mockPool.query.mock.calls[0];
      expect(params[11]).toBe('new');
    });
  });

  describe('decrementStock', () => {
    it('returns true when stock is sufficient and decremented', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      const result = await productRepository.decrementStock('product-123', 2);

      expect(result).toBe(true);
      const [sql, params] = mockPool.query.mock.calls[0];
      expect(sql).toContain('stock >= $1');
      expect(params).toEqual([2, 'product-123']);
    });

    it('returns false when stock is insufficient', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 0 });

      const result = await productRepository.decrementStock('product-123', 100);

      expect(result).toBe(false);
    });
  });

  describe('incrementStock', () => {
    it('restores stock atomically', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      await productRepository.incrementStock('product-123', 5);

      const [sql, params] = mockPool.query.mock.calls[0];
      expect(sql).toContain('stock = stock + $1');
      expect(params).toEqual([5, 'product-123']);
    });
  });

  describe('softDelete', () => {
    it('sets deleted_at timestamp', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await productRepository.softDelete('product-123');

      const [sql, params] = mockPool.query.mock.calls[0];
      expect(sql).toContain('deleted_at = NOW()');
      expect(params).toEqual(['product-123']);
    });
  });
});

// ─── Order Repository ─────────────────────────────────────────────────────────

describe('orderRepository', () => {
  const mockOrder = {
    id: 'order-123',
    buyer_id: 'buyer-id',
    store_id: 'store-123',
    status: 'pending_payment',
    subtotal_cents: 2999,
    delivery_fee_cents: 599,
    platform_fee_cents: 450,
    total_cents: 3598,
    stripe_payment_intent_id: 'pi_test',
  };

  describe('findByBuyer', () => {
    it('returns paginated orders for buyer', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockOrder] })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] });

      const result = await orderRepository.findByBuyer('buyer-id', { limit: 20, offset: 0 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(3);
    });
  });

  describe('findByStore', () => {
    it('returns orders without status filter', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockOrder] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await orderRepository.findByStore('store-123');

      expect(result.total).toBe(1);
      const [sql] = mockPool.query.mock.calls[0];
      expect(sql).not.toContain('status =');
    });

    it('adds status filter when provided', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await orderRepository.findByStore('store-123', { status: 'delivered' as any });

      const [sql] = mockPool.query.mock.calls[0];
      expect(sql).toContain('status =');
    });
  });

  describe('create', () => {
    it('inserts order with pending_payment status', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockOrder] });

      await orderRepository.create({
        id: 'order-123',
        buyer_id: 'buyer-id',
        store_id: 'store-123',
        delivery_address: { line1: '456 Elm', city: 'Austin', state: 'TX', zip: '78702', country: 'US' },
        subtotal_cents: 2999,
        delivery_fee_cents: 599,
        platform_fee_cents: 450,
        total_cents: 3598,
        stripe_payment_intent_id: 'pi_test',
      });

      const [sql] = mockPool.query.mock.calls[0];
      expect(sql).toContain("'pending_payment'");
    });
  });

  describe('createItems', () => {
    it('returns empty array when no items provided', async () => {
      const result = await orderRepository.createItems([]);

      expect(result).toEqual([]);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('batch-inserts all items in a single query', async () => {
      const items = [
        { id: 'item-1', order_id: 'order-123', product_id: 'prod-1', quantity: 2, unit_price_cents: 1000, total_cents: 2000 },
        { id: 'item-2', order_id: 'order-123', product_id: 'prod-2', quantity: 1, unit_price_cents: 500, total_cents: 500 },
      ];
      mockPool.query.mockResolvedValue({ rows: items });

      await orderRepository.createItems(items);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      const [sql] = mockPool.query.mock.calls[0];
      expect(sql).toContain('$1'); // first item
      expect(sql).toContain('$7'); // second item starts at offset 6
    });
  });

  describe('updateStripeStatus', () => {
    it('updates stripe_payment_status by payment_intent_id', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockOrder] });

      await orderRepository.updateStripeStatus('pi_test', 'succeeded');

      const [sql, params] = mockPool.query.mock.calls[0];
      expect(sql).toContain('stripe_payment_intent_id = $2');
      expect(params).toEqual(['succeeded', 'pi_test']);
    });
  });

  describe('getItems', () => {
    it('returns all items for an order', async () => {
      const items = [{ id: 'item-1', order_id: 'order-123' }];
      mockPool.query.mockResolvedValue({ rows: items });

      const result = await orderRepository.getItems('order-123');

      expect(result).toEqual(items);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM order_items WHERE order_id = $1',
        ['order-123']
      );
    });
  });
});

// ─── Driver Repository ────────────────────────────────────────────────────────

describe('driverRepository', () => {
  const mockDriver = {
    id: 'driver-123',
    user_id: 'user-123',
    vehicle_type: 'car',
    status: 'online',
    is_verified: false,
  };

  const mockDelivery = {
    id: 'delivery-123',
    order_id: 'order-123',
    driver_id: null,
    status: 'pending',
    driver_fee_cents: 1200,
  };

  describe('findByUserId', () => {
    it('queries by user_id', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockDriver] });

      await driverRepository.findByUserId('user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM drivers WHERE user_id = $1 AND deleted_at IS NULL',
        ['user-123']
      );
    });
  });

  describe('updateLocation', () => {
    it('updates current_lat and current_lng', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await driverRepository.updateLocation('driver-123', 30.27, -97.74);

      const [sql, params] = mockPool.query.mock.calls[0];
      expect(sql).toContain('current_lat = $1');
      expect(sql).toContain('current_lng = $2');
      expect(params).toEqual([30.27, -97.74, 'driver-123']);
    });
  });

  describe('findAvailableNearby', () => {
    it('uses PostGIS join with stores for proximity', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await driverRepository.findAvailableNearby(30.27, -97.74, 5000);

      const [sql, params] = mockPool.query.mock.calls[0];
      expect(sql).toContain("d.status = 'pending'");
      expect(sql).toContain('d.driver_id IS NULL');
      expect(sql).toContain('ST_DWithin');
      expect(params).toEqual([30.27, -97.74, 5000]);
    });
  });

  describe('assignDriver', () => {
    it('returns delivery when assignment succeeds', async () => {
      const assigned = { ...mockDelivery, driver_id: 'driver-123', status: 'assigned' };
      mockPool.query.mockResolvedValue({ rows: [assigned] });

      const result = await driverRepository.assignDriver('delivery-123', 'driver-123');

      expect(result).toEqual(assigned);
      const [sql] = mockPool.query.mock.calls[0];
      expect(sql).toContain("driver_id IS NULL AND status = 'pending'");
    });

    it('returns null when delivery is already assigned', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await driverRepository.assignDriver('delivery-123', 'driver-123');

      expect(result).toBeNull();
    });
  });

  describe('updateDeliveryStatus', () => {
    it('updates delivery status with basic fields', async () => {
      const updated = { ...mockDelivery, status: 'in_transit' };
      mockPool.query.mockResolvedValue({ rows: [updated] });

      await driverRepository.updateDeliveryStatus('delivery-123', 'in_transit' as any);

      const [sql] = mockPool.query.mock.calls[0];
      expect(sql).toContain('status = $1');
    });

    it('includes pickup_at when provided in extras', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockDelivery] });

      const pickupAt = new Date();
      await driverRepository.updateDeliveryStatus('delivery-123', 'picked_up' as any, { pickup_at: pickupAt });

      const [sql, params] = mockPool.query.mock.calls[0];
      expect(sql).toContain('pickup_at');
      expect(params).toContain(pickupAt);
    });

    it('includes delivered_at when provided in extras', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockDelivery] });

      const deliveredAt = new Date();
      await driverRepository.updateDeliveryStatus('delivery-123', 'delivered' as any, { delivered_at: deliveredAt });

      const [sql, params] = mockPool.query.mock.calls[0];
      expect(sql).toContain('delivered_at');
      expect(params).toContain(deliveredAt);
    });
  });
});

// ─── Review Repository ────────────────────────────────────────────────────────

describe('reviewRepository', () => {
  describe('create', () => {
    it('inserts review and returns it', async () => {
      const mockReview = { id: 'review-123', rating: 5, target_type: 'store' };
      mockPool.query.mockResolvedValue({ rows: [mockReview] });

      const result = await reviewRepository.create({
        id: 'review-123',
        order_id: 'order-123',
        reviewer_id: 'buyer-id',
        target_type: 'store',
        target_id: 'store-123',
        rating: 5,
        comment: 'Great!',
      });

      expect(result).toEqual(mockReview);
      const [sql] = mockPool.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO reviews');
    });

    it('passes null for comment when omitted', async () => {
      mockPool.query.mockResolvedValue({ rows: [{}] });

      await reviewRepository.create({
        id: 'review-123',
        order_id: 'order-123',
        reviewer_id: 'buyer-id',
        target_type: 'driver',
        target_id: 'driver-123',
        rating: 4,
      });

      const [, params] = mockPool.query.mock.calls[0];
      expect(params[6]).toBeNull(); // comment
    });
  });

  describe('getAverageRating', () => {
    it('returns parsed avg and count', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ avg: '4.25', count: '8' }] });

      const result = await reviewRepository.getAverageRating('store', 'store-123');

      expect(result.avg).toBe(4.25);
      expect(result.count).toBe(8);
    });

    it('returns 0 values when no reviews exist', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ avg: null, count: '0' }] });

      const result = await reviewRepository.getAverageRating('driver', 'driver-123');

      expect(result.avg).toBe(0);
      expect(result.count).toBe(0);
    });
  });
});

// ─── Payout Repository ────────────────────────────────────────────────────────

describe('payoutRepository', () => {
  const mockPayout = {
    id: 'payout-123',
    recipient_type: 'store_owner',
    recipient_id: 'owner-id',
    order_id: 'order-123',
    amount_cents: 5000,
    status: 'pending',
    stripe_transfer_id: null,
    paid_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  describe('create', () => {
    it('inserts payout and returns it', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockPayout] });

      const result = await payoutRepository.create({
        id: 'payout-123',
        recipient_type: 'store_owner',
        recipient_id: 'owner-id',
        order_id: 'order-123',
        amount_cents: 5000,
      });

      expect(result).toEqual(mockPayout);
      const [sql] = mockPool.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO payouts');
    });
  });

  describe('updateStatus', () => {
    it('updates status and sets paid_at when status is paid', async () => {
      const paid = { ...mockPayout, status: 'paid', paid_at: new Date().toISOString() };
      mockPool.query.mockResolvedValue({ rows: [paid] });

      const result = await payoutRepository.updateStatus('payout-123', 'paid' as any);

      expect(result?.status).toBe('paid');
      const [sql] = mockPool.query.mock.calls[0];
      expect(sql).toContain("CASE WHEN $1 = 'paid' THEN NOW()");
    });

    it('includes stripe_transfer_id when provided', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ ...mockPayout, stripe_transfer_id: 'tr_123' }] });

      await payoutRepository.updateStatus('payout-123', 'paid' as any, 'tr_123');

      const [, params] = mockPool.query.mock.calls[0];
      expect(params[1]).toBe('tr_123');
    });

    it('passes null stripe_transfer_id when not provided', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockPayout] });

      await payoutRepository.updateStatus('payout-123', 'processing' as any);

      const [, params] = mockPool.query.mock.calls[0];
      expect(params[1]).toBeNull();
    });
  });

  describe('findByRecipient', () => {
    it('returns paginated payouts for recipient', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockPayout] })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] });

      const result = await payoutRepository.findByRecipient('store_owner', 'owner-id', {
        limit: 10,
        offset: 0,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(3);
    });
  });
});
