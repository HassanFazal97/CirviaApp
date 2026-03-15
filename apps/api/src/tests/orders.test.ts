import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildTestApp } from './helpers/buildTestApp';
import { orderRepository } from '../repositories/order.repository';
import { orderService } from '../services/order.service';
import { stripeService } from '../services/stripe.service';

vi.mock('../config', () => ({
  config: {
    NODE_ENV: 'test',
    PORT: 3001,
    DATABASE_URL: 'postgres://localhost/test',
    REDIS_URL: 'redis://localhost',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    JWT_SECRET: 'test-jwt-secret-that-is-at-least-32-chars!!',
    JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-at-least-32chars',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '30d',
    STRIPE_SECRET_KEY: 'sk_test_dummy',
    STRIPE_WEBHOOK_SECRET: 'whsec_test',
    ALGOLIA_APP_ID: 'test-app-id',
    ALGOLIA_API_KEY: 'test-api-key',
    ALGOLIA_SEARCH_KEY: 'test-search-key',
    AWS_S3_BUCKET: 'test-bucket',
    AWS_REGION: 'us-east-1',
    RESEND_API_KEY: 're_test_key',
    CORS_ORIGIN: '*',
  },
}));

vi.mock('@fastify/rate-limit', () => ({ default: async () => {} }));

vi.mock('../db', () => ({
  supabase: {
    auth: {
      admin: { createUser: vi.fn() },
      signInWithPassword: vi.fn(),
    },
  },
  pool: { query: vi.fn() },
}));

vi.mock('../redis', () => ({
  redis: { setex: vi.fn().mockResolvedValue('OK'), get: vi.fn(), del: vi.fn(), set: vi.fn() },
  TTL: { REFRESH_TOKEN: 2592000, DRIVER_JOB_LOCK: 30, RATE_LIMIT: 60 },
  acquireLock: vi.fn(),
  releaseLock: vi.fn(),
}));

vi.mock('../queues/stock.queue', () => ({
  stockRestoreQueue: { add: vi.fn() },
  stockRestoreWorker: { close: vi.fn(), on: vi.fn() },
}));

vi.mock('../repositories/user.repository', () => ({
  userRepository: { findById: vi.fn(), findByEmail: vi.fn(), create: vi.fn(), update: vi.fn() },
}));

vi.mock('../services/algolia.service', () => ({
  algoliaService: {
    indexProduct: vi.fn(),
    indexStore: vi.fn(),
    removeProduct: vi.fn(),
    searchProducts: vi.fn(),
  },
}));

vi.mock('../repositories/order.repository', () => ({
  orderRepository: {
    findById: vi.fn(),
    findByBuyer: vi.fn(),
    findByStore: vi.fn(),
    create: vi.fn(),
    createItems: vi.fn(),
    updateStatus: vi.fn(),
    updateStripeStatus: vi.fn(),
    getItems: vi.fn(),
  },
}));

vi.mock('../services/order.service', () => ({
  orderService: {
    createOrder: vi.fn(),
    confirmPayment: vi.fn(),
    handlePaymentFailed: vi.fn(),
  },
}));

vi.mock('../services/stripe.service', () => ({
  stripeService: {
    createPaymentIntent: vi.fn(),
    cancelPaymentIntent: vi.fn(),
    constructWebhookEvent: vi.fn(),
  },
}));

// All IDs must be valid UUIDs to pass Zod uuid() validation in schemas
const STORE_ID = '11111111-1111-1111-1111-111111111111';
const PRODUCT_ID = '22222222-2222-2222-2222-222222222222';
const ORDER_ID = '33333333-3333-3333-3333-333333333333';

const mockOrder = {
  id: ORDER_ID,
  buyer_id: 'buyer-id',
  store_id: STORE_ID,
  status: 'pending_payment',
  delivery_address: { line1: '456 Elm St', city: 'Austin', state: 'TX', zip: '78702', country: 'US' },
  delivery_notes: null,
  subtotal_cents: 2999,
  delivery_fee_cents: 599,
  platform_fee_cents: 450,
  total_cents: 3598,
  stripe_payment_intent_id: 'pi_test123',
  stripe_payment_status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
};

const mockOrderItem = {
  id: 'item-123',
  order_id: ORDER_ID,
  product_id: PRODUCT_ID,
  quantity: 1,
  unit_price_cents: 2999,
  total_cents: 2999,
};

describe('Orders routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let buyerToken: string;
  let ownerToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp();
    await app.ready();
    buyerToken = app.jwt.sign({ sub: 'buyer-id', email: 'buyer@test.com', role: 'buyer' });
    ownerToken = app.jwt.sign({ sub: 'owner-id', email: 'owner@test.com', role: 'store_owner' });
  });

  describe('POST /api/v1/orders', () => {
    const createBody = {
      store_id: STORE_ID,
      items: [{ product_id: PRODUCT_ID, quantity: 1 }],
      delivery_address: { line1: '456 Elm St', city: 'Austin', state: 'TX', zip: '78702', country: 'US' },
    };

    it('returns 201 with order and client_secret', async () => {
      vi.mocked(orderService.createOrder).mockResolvedValue({
        order: mockOrder as any,
        client_secret: 'pi_test123_secret_abc',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/orders',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: createBody,
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.order).toBeDefined();
      expect(body.client_secret).toBe('pi_test123_secret_abc');
    });

    it('passes buyer_id from JWT to orderService', async () => {
      vi.mocked(orderService.createOrder).mockResolvedValue({
        order: mockOrder as any,
        client_secret: 'secret',
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/orders',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: createBody,
      });

      expect(orderService.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ buyer_id: 'buyer-id' })
      );
    });

    it('returns 422 when orderService throws (e.g. out of stock)', async () => {
      vi.mocked(orderService.createOrder).mockRejectedValue(
        new Error('Insufficient stock for Test Product')
      );

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/orders',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: createBody,
      });

      expect(res.statusCode).toBe(422);
      expect(res.json().message).toContain('Insufficient stock');
    });

    it('returns 400 when items array is empty', async () => {
      vi.mocked(orderService.createOrder).mockResolvedValue({
        order: mockOrder as any,
        client_secret: 'secret',
      });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/orders',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: { ...createBody, items: [] },
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when store_id is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/orders',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: { items: createBody.items, delivery_address: createBody.delivery_address },
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/orders',
        payload: createBody,
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/orders', () => {
    it('returns buyer order history with pagination', async () => {
      vi.mocked(orderRepository.findByBuyer).mockResolvedValue({
        data: [mockOrder as any],
        total: 1,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/orders',
        headers: { authorization: `Bearer ${buyerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(1);
      expect(body.total).toBe(1);
    });

    it('queries using buyer_id from JWT', async () => {
      vi.mocked(orderRepository.findByBuyer).mockResolvedValue({ data: [], total: 0 });

      await app.inject({
        method: 'GET',
        url: '/api/v1/orders',
        headers: { authorization: `Bearer ${buyerToken}` },
      });

      expect(orderRepository.findByBuyer).toHaveBeenCalledWith(
        'buyer-id',
        expect.objectContaining({ limit: 20, offset: 0 })
      );
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/orders' });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/orders/:id', () => {
    it('returns 200 with order and items for the buyer', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder as any);
      vi.mocked(orderRepository.getItems).mockResolvedValue([mockOrderItem as any]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/orders/order-123',
        headers: { authorization: `Bearer ${buyerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.order.id).toBe(ORDER_ID);
      expect(body.items).toHaveLength(1);
    });

    it('returns 200 for store_owner', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder as any);
      vi.mocked(orderRepository.getItems).mockResolvedValue([]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/orders/order-123',
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(res.statusCode).toBe(200);
    });

    it('returns 403 when a different buyer tries to view the order', async () => {
      const otherBuyerToken = app.jwt.sign({
        sub: 'other-buyer-id',
        email: 'other@test.com',
        role: 'buyer',
      });
      vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder as any); // buyer_id = 'buyer-id'

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/orders/order-123',
        headers: { authorization: `Bearer ${otherBuyerToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 404 when order does not exist', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/orders/nonexistent',
        headers: { authorization: `Bearer ${buyerToken}` },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/orders/webhook', () => {
    it('returns 400 when stripe-signature header is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/orders/webhook',
        headers: { 'content-type': 'application/json' },
        payload: '{}',
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when webhook signature is invalid', async () => {
      vi.mocked(stripeService.constructWebhookEvent).mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/orders/webhook',
        headers: { 'stripe-signature': 't=bad,v1=bad', 'content-type': 'application/json' },
        payload: '{}',
      });

      expect(res.statusCode).toBe(400);
    });

    it('calls confirmPayment on payment_intent.succeeded event', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test123' } },
      };
      vi.mocked(stripeService.constructWebhookEvent).mockReturnValue(mockEvent as any);
      vi.mocked(orderService.confirmPayment).mockResolvedValue(mockOrder as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/orders/webhook',
        headers: { 'stripe-signature': 't=valid,v1=valid', 'content-type': 'application/json' },
        payload: JSON.stringify(mockEvent),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().received).toBe(true);
      expect(orderService.confirmPayment).toHaveBeenCalledWith('pi_test123');
    });

    it('calls handlePaymentFailed on payment_intent.payment_failed event', async () => {
      const mockEvent = {
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_test123' } },
      };
      vi.mocked(stripeService.constructWebhookEvent).mockReturnValue(mockEvent as any);
      vi.mocked(orderService.handlePaymentFailed).mockResolvedValue(undefined);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/orders/webhook',
        headers: { 'stripe-signature': 't=valid,v1=valid', 'content-type': 'application/json' },
        payload: JSON.stringify(mockEvent),
      });

      expect(res.statusCode).toBe(200);
      expect(orderService.handlePaymentFailed).toHaveBeenCalledWith('pi_test123');
    });

    it('returns 200 for unknown event types without processing them', async () => {
      const mockEvent = { type: 'customer.created', data: { object: {} } };
      vi.mocked(stripeService.constructWebhookEvent).mockReturnValue(mockEvent as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/orders/webhook',
        headers: { 'stripe-signature': 't=valid,v1=valid', 'content-type': 'application/json' },
        payload: JSON.stringify(mockEvent),
      });

      expect(res.statusCode).toBe(200);
      expect(orderService.confirmPayment).not.toHaveBeenCalled();
      expect(orderService.handlePaymentFailed).not.toHaveBeenCalled();
    });
  });
});
