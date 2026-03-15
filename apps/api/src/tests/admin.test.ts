import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildTestApp } from './helpers/buildTestApp';
import { pool } from '../db';

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

vi.mock('../repositories/store.repository', () => ({
  storeRepository: {
    findById: vi.fn(),
    findNearby: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
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

vi.mock('../repositories/driver.repository', () => ({
  driverRepository: {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    create: vi.fn(),
    updateLocation: vi.fn(),
    updateStatus: vi.fn(),
    findDeliveryById: vi.fn(),
    findDeliveryByOrder: vi.fn(),
    findAvailableNearby: vi.fn(),
    createDelivery: vi.fn(),
    assignDriver: vi.fn(),
    updateDeliveryStatus: vi.fn(),
  },
}));

vi.mock('../repositories/payout.repository', () => ({
  payoutRepository: {
    create: vi.fn(),
    updateStatus: vi.fn(),
    findByRecipient: vi.fn(),
  },
}));

vi.mock('../services/algolia.service', () => ({
  algoliaService: {
    indexProduct: vi.fn(),
    indexStore: vi.fn(),
    removeProduct: vi.fn(),
    searchProducts: vi.fn(),
  },
}));

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

const mockStore = {
  id: 'store-123',
  owner_id: 'owner-id',
  type: 'retail',
  name: 'Test Store',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
};

const mockDriver = {
  id: 'driver-123',
  user_id: 'driver-user-id',
  vehicle_type: 'car',
  status: 'online',
  is_verified: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
};

describe('Admin routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let adminToken: string;
  let buyerToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp();
    await app.ready();
    adminToken = app.jwt.sign({ sub: 'admin-id', email: 'admin@test.com', role: 'admin' });
    buyerToken = app.jwt.sign({ sub: 'buyer-id', email: 'buyer@test.com', role: 'buyer' });
  });

  describe('GET /api/v1/admin/users', () => {
    it('returns 200 with paginated users for admin', async () => {
      vi.mocked(pool.query)
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(1);
      expect(body.total).toBe(1);
    });

    it('returns 403 for non-admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        headers: { authorization: `Bearer ${buyerToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/admin/stores', () => {
    it('returns 200 with paginated stores', async () => {
      vi.mocked(pool.query)
        .mockResolvedValueOnce({ rows: [mockStore], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/stores',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(1);
    });

    it('returns 403 for non-admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/stores',
        headers: { authorization: `Bearer ${buyerToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/admin/orders', () => {
    it('returns all orders without a status filter', async () => {
      vi.mocked(pool.query)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/orders',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().total).toBe(0);
    });

    it('filters orders by status', async () => {
      vi.mocked(pool.query)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/orders?status=pending_payment',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      // Verify the status filter was applied in the SQL call
      const queryCalls = vi.mocked(pool.query).mock.calls;
      expect(queryCalls.some((call) => String(call[0]).includes('status'))).toBe(true);
    });
  });

  describe('GET /api/v1/admin/drivers', () => {
    it('returns all drivers', async () => {
      vi.mocked(pool.query)
        .mockResolvedValueOnce({ rows: [mockDriver], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/drivers',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/admin/payouts', () => {
    it('returns all payouts', async () => {
      vi.mocked(pool.query)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/payouts',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/v1/admin/reviews', () => {
    it('returns all reviews', async () => {
      vi.mocked(pool.query)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/reviews',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('PATCH /api/v1/admin/drivers/:id/verify', () => {
    it('toggles driver is_verified and returns updated driver', async () => {
      const verifiedDriver = { ...mockDriver, is_verified: true };
      vi.mocked(pool.query).mockResolvedValue({ rows: [verifiedDriver], rowCount: 1 } as any);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/drivers/driver-123/verify',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().driver.is_verified).toBe(true);
    });

    it('returns 404 when driver does not exist', async () => {
      vi.mocked(pool.query).mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/drivers/nonexistent/verify',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 403 for non-admin', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/drivers/driver-123/verify',
        headers: { authorization: `Bearer ${buyerToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('PATCH /api/v1/admin/stores/:id/active', () => {
    it('toggles store is_active and returns updated store', async () => {
      const deactivatedStore = { ...mockStore, is_active: false };
      vi.mocked(pool.query).mockResolvedValue({ rows: [deactivatedStore], rowCount: 1 } as any);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/stores/store-123/active',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().store.is_active).toBe(false);
    });

    it('returns 404 when store does not exist', async () => {
      vi.mocked(pool.query).mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/stores/nonexistent/active',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 403 for non-admin', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/stores/store-123/active',
        headers: { authorization: `Bearer ${buyerToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });
});
