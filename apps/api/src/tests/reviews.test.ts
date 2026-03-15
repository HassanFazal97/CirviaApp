import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildTestApp } from './helpers/buildTestApp';
import { reviewRepository } from '../repositories/review.repository';
import { orderRepository } from '../repositories/order.repository';

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

vi.mock('../repositories/review.repository', () => ({
  reviewRepository: {
    create: vi.fn(),
    getAverageRating: vi.fn(),
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

// All IDs must be valid UUIDs to pass Zod uuid() validation
const ORDER_ID = '33333333-3333-3333-3333-333333333333';
const STORE_ID = '11111111-1111-1111-1111-111111111111';

const mockDeliveredOrder = {
  id: ORDER_ID,
  buyer_id: 'buyer-id',
  store_id: STORE_ID,
  status: 'delivered',
  delivery_address: { line1: '456 Elm St', city: 'Austin', state: 'TX', zip: '78702', country: 'US' },
  delivery_notes: null,
  subtotal_cents: 2999,
  delivery_fee_cents: 599,
  platform_fee_cents: 450,
  total_cents: 3598,
  stripe_payment_intent_id: 'pi_test123',
  stripe_payment_status: 'succeeded',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
};

const mockReview = {
  id: 'review-123',
  order_id: ORDER_ID,
  reviewer_id: 'buyer-id',
  target_type: 'store',
  target_id: STORE_ID,
  rating: 5 as const,
  comment: 'Great store!',
  created_at: new Date().toISOString(),
};

describe('Reviews routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let buyerToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp();
    await app.ready();
    buyerToken = app.jwt.sign({ sub: 'buyer-id', email: 'buyer@test.com', role: 'buyer' });
  });

  describe('POST /api/v1/reviews', () => {
    const reviewBody = {
      order_id: ORDER_ID,
      target_type: 'store',
      target_id: STORE_ID,
      rating: 5,
      comment: 'Great store!',
    };

    it('returns 201 when buyer posts a review for a delivered order', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(mockDeliveredOrder as any);
      vi.mocked(reviewRepository.create).mockResolvedValue(mockReview as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/reviews',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: reviewBody,
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().review).toBeDefined();
    });

    it('uses reviewer_id from JWT sub', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(mockDeliveredOrder as any);
      vi.mocked(reviewRepository.create).mockResolvedValue(mockReview as any);

      await app.inject({
        method: 'POST',
        url: '/api/v1/reviews',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: reviewBody,
      });

      expect(reviewRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ reviewer_id: 'buyer-id' })
      );
    });

    it('returns 404 when order does not belong to the buyer', async () => {
      const otherBuyerToken = app.jwt.sign({
        sub: 'other-buyer',
        email: 'other@test.com',
        role: 'buyer',
      });
      vi.mocked(orderRepository.findById).mockResolvedValue(mockDeliveredOrder as any); // buyer_id = 'buyer-id'

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/reviews',
        headers: { authorization: `Bearer ${otherBuyerToken}` },
        payload: reviewBody,
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 404 when order does not exist', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/reviews',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: reviewBody,
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 422 when order is not yet delivered', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue({
        ...mockDeliveredOrder,
        status: 'preparing',
      } as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/reviews',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: reviewBody,
      });

      expect(res.statusCode).toBe(422);
      expect(res.json().message).toContain('delivered');
    });

    it('returns 409 when buyer already reviewed the order (unique constraint)', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(mockDeliveredOrder as any);
      vi.mocked(reviewRepository.create).mockRejectedValue(
        new Error('unique constraint violation')
      );

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/reviews',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: reviewBody,
      });

      expect(res.statusCode).toBe(409);
    });

    it('returns 400 for invalid rating (out of 1-5 range)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/reviews',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: { ...reviewBody, rating: 6 },
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns 400 for invalid target_type', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/reviews',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: { ...reviewBody, target_type: 'product' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/reviews',
        payload: reviewBody,
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/reviews/:targetType/:targetId/average', () => {
    it('returns average rating and count for a store', async () => {
      vi.mocked(reviewRepository.getAverageRating).mockResolvedValue({ avg: 4.5, count: 10 });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/reviews/store/store-123/average',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.avg).toBe(4.5);
      expect(body.count).toBe(10);
    });

    it('returns 0 avg and count when no reviews exist', async () => {
      vi.mocked(reviewRepository.getAverageRating).mockResolvedValue({ avg: 0, count: 0 });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/reviews/driver/driver-123/average',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().count).toBe(0);
    });

    it('queries with correct target_type and target_id', async () => {
      vi.mocked(reviewRepository.getAverageRating).mockResolvedValue({ avg: 3.8, count: 5 });

      await app.inject({
        method: 'GET',
        url: '/api/v1/reviews/driver/driver-456/average',
      });

      expect(reviewRepository.getAverageRating).toHaveBeenCalledWith('driver', 'driver-456');
    });

    it('does not require authentication', async () => {
      vi.mocked(reviewRepository.getAverageRating).mockResolvedValue({ avg: 4.0, count: 3 });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/reviews/store/store-123/average',
        // no auth header
      });

      expect(res.statusCode).toBe(200);
    });
  });
});
