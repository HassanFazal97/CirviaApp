import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildTestApp } from './helpers/buildTestApp';
import { storeRepository } from '../repositories/store.repository';
import { productRepository } from '../repositories/product.repository';

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

// Rate-limit plugin calls redis.defineCommand which isn't in our mock — bypass it in tests
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
    indexProduct: vi.fn().mockResolvedValue(undefined),
    indexStore: vi.fn().mockResolvedValue(undefined),
    removeProduct: vi.fn().mockResolvedValue(undefined),
    searchProducts: vi.fn().mockResolvedValue({ hits: [], nbHits: 0, page: 0, nbPages: 0 }),
  },
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

vi.mock('../repositories/product.repository', () => ({
  productRepository: {
    findById: vi.fn(),
    listByStore: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    decrementStock: vi.fn(),
    incrementStock: vi.fn(),
    softDelete: vi.fn(),
  },
}));

const mockStore = {
  id: 'store-123',
  owner_id: 'owner-id',
  type: 'retail',
  name: 'Test Store',
  description: 'A test store',
  address: { line1: '123 Main St', city: 'Austin', state: 'TX', zip: '78701', country: 'US' },
  lat: 30.2672,
  lng: -97.7431,
  phone: null,
  email: null,
  is_active: true,
  logo_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
};

const mockProduct = {
  id: 'product-123',
  store_id: 'store-123',
  name: 'Test Product',
  description: null,
  sku: null,
  category: 'Electronics',
  unit: 'each',
  price_cents: 2999,
  stock: 10,
  image_urls: [],
  weight_kg: null,
  condition: 'new',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
};

describe('Stores routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let ownerToken: string;
  let buyerToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp();
    await app.ready();
    ownerToken = app.jwt.sign({ sub: 'owner-id', email: 'owner@test.com', role: 'store_owner' });
    buyerToken = app.jwt.sign({ sub: 'buyer-id', email: 'buyer@test.com', role: 'buyer' });
  });

  describe('GET /api/v1/stores/nearby', () => {
    it('returns 200 with nearby stores', async () => {
      vi.mocked(storeRepository.findNearby).mockResolvedValue([
        { ...mockStore, distance_meters: 500 } as typeof mockStore & { distance_meters: number },
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/stores/nearby?lat=30.27&lng=-97.74',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(1);
      expect(body.count).toBe(1);
    });

    it('returns empty array when no stores nearby', async () => {
      vi.mocked(storeRepository.findNearby).mockResolvedValue([]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/stores/nearby?lat=30.27&lng=-97.74',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(0);
    });

    it('returns 400 when lat is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/stores/nearby?lng=-97.74',
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when lat is out of range', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/stores/nearby?lat=91&lng=-97.74',
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when lng is out of range', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/stores/nearby?lat=30.27&lng=181',
      });
      expect(res.statusCode).toBe(400);
    });

    it('passes radius parameter to repository', async () => {
      vi.mocked(storeRepository.findNearby).mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/api/v1/stores/nearby?lat=30.27&lng=-97.74&radius=5000',
      });

      expect(storeRepository.findNearby).toHaveBeenCalledWith(30.27, -97.74, 5000, 20, 0);
    });
  });

  describe('GET /api/v1/stores/:id', () => {
    it('returns 200 with the store', async () => {
      vi.mocked(storeRepository.findById).mockResolvedValue(mockStore);

      const res = await app.inject({ method: 'GET', url: '/api/v1/stores/store-123' });

      expect(res.statusCode).toBe(200);
      expect(res.json().store.id).toBe('store-123');
    });

    it('returns 404 when store does not exist', async () => {
      vi.mocked(storeRepository.findById).mockResolvedValue(null);

      const res = await app.inject({ method: 'GET', url: '/api/v1/stores/nonexistent' });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/stores/:id/products', () => {
    it('returns paginated products for a store', async () => {
      vi.mocked(storeRepository.findById).mockResolvedValue(mockStore);
      vi.mocked(productRepository.listByStore).mockResolvedValue({ data: [mockProduct], total: 1 });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/stores/store-123/products',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toHaveLength(1);
      expect(body.total).toBe(1);
      expect(body.has_more).toBe(false);
    });

    it('returns 404 when store does not exist', async () => {
      vi.mocked(storeRepository.findById).mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/stores/nonexistent/products',
      });

      expect(res.statusCode).toBe(404);
    });

    it('uses limit and offset from query params', async () => {
      vi.mocked(storeRepository.findById).mockResolvedValue(mockStore);
      vi.mocked(productRepository.listByStore).mockResolvedValue({ data: [], total: 5 });

      await app.inject({
        method: 'GET',
        url: '/api/v1/stores/store-123/products?limit=2&offset=4',
      });

      expect(productRepository.listByStore).toHaveBeenCalledWith('store-123', { limit: 2, offset: 4 });
    });
  });

  describe('POST /api/v1/stores', () => {
    const createBody = {
      type: 'retail',
      name: 'My New Store',
      address: { line1: '123 Main St', city: 'Austin', state: 'TX', zip: '78701', country: 'US' },
      lat: 30.2672,
      lng: -97.7431,
    };

    it('returns 201 when store_owner creates a store', async () => {
      vi.mocked(storeRepository.create).mockResolvedValue(mockStore);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/stores',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: createBody,
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().store).toBeDefined();
    });

    it('returns 403 when buyer tries to create a store', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/stores',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: createBody,
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/stores',
        payload: createBody,
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 400 when name is too short', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/stores',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { ...createBody, name: 'X' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/stores',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { name: 'My Store' }, // missing type, address, lat, lng
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/v1/stores/:id', () => {
    it('returns 200 when owner updates their store', async () => {
      const updated = { ...mockStore, name: 'Updated Store' };
      vi.mocked(storeRepository.findById).mockResolvedValue(mockStore);
      vi.mocked(storeRepository.update).mockResolvedValue(updated);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/stores/store-123',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { name: 'Updated Store' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().store.name).toBe('Updated Store');
    });

    it('returns 403 when a different user tries to update', async () => {
      vi.mocked(storeRepository.findById).mockResolvedValue(mockStore); // owner_id = 'owner-id', not 'buyer-id'

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/stores/store-123',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: { name: 'Hacked' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 404 when store does not exist', async () => {
      vi.mocked(storeRepository.findById).mockResolvedValue(null);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/stores/nonexistent',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { name: 'Updated' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/stores/store-123',
        payload: { name: 'Updated' },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/stores/:id/products', () => {
    const productBody = {
      name: 'New Product',
      category: 'Electronics',
      unit: 'each',
      price_cents: 2999,
      stock: 5,
    };

    it('returns 201 when owner adds a product', async () => {
      vi.mocked(storeRepository.findById).mockResolvedValue(mockStore);
      vi.mocked(productRepository.create).mockResolvedValue(mockProduct);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/stores/store-123/products',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: productBody,
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().product).toBeDefined();
    });

    it('returns 403 when non-owner tries to add product', async () => {
      vi.mocked(storeRepository.findById).mockResolvedValue(mockStore);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/stores/store-123/products',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: productBody,
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 404 when store does not exist', async () => {
      vi.mocked(storeRepository.findById).mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/stores/store-123/products',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: productBody,
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 when price_cents is negative', async () => {
      vi.mocked(storeRepository.findById).mockResolvedValue(mockStore);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/stores/store-123/products',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { ...productBody, price_cents: -1 },
      });

      expect(res.statusCode).toBe(400);
    });
  });
});
