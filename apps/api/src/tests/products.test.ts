import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildTestApp } from './helpers/buildTestApp';
import { productRepository } from '../repositories/product.repository';
import { storeRepository } from '../repositories/store.repository';
import { algoliaService } from '../services/algolia.service';

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
    indexProduct: vi.fn().mockResolvedValue(undefined),
    indexStore: vi.fn().mockResolvedValue(undefined),
    removeProduct: vi.fn().mockResolvedValue(undefined),
    searchProducts: vi.fn(),
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

vi.mock('../repositories/store.repository', () => ({
  storeRepository: {
    findById: vi.fn(),
    findNearby: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  },
}));

const mockStore = {
  id: 'store-123',
  owner_id: 'owner-id',
  type: 'retail' as const,
  name: 'Test Store',
  description: null,
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
  condition: 'new' as const,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
};

describe('Products routes', () => {
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

  describe('GET /api/v1/products/search', () => {
    it('returns 200 with search results', async () => {
      vi.mocked(algoliaService.searchProducts).mockResolvedValue({
        hits: [{ objectID: 'product-123', name: 'Test Product' }] as any[],
        nbHits: 1,
        page: 0,
        nbPages: 1,
      } as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/products/search?q=test',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.hits).toHaveLength(1);
      expect(body.nbHits).toBe(1);
      expect(body.query).toBe('test');
    });

    it('returns 200 with empty results for no matches', async () => {
      vi.mocked(algoliaService.searchProducts).mockResolvedValue({
        hits: [],
        nbHits: 0,
        page: 0,
        nbPages: 0,
      } as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/products/search?q=nonexistent',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().hits).toHaveLength(0);
    });

    it('passes filters to algolia', async () => {
      vi.mocked(algoliaService.searchProducts).mockResolvedValue({
        hits: [],
        nbHits: 0,
        page: 0,
        nbPages: 0,
      } as any);

      await app.inject({
        method: 'GET',
        url: '/api/v1/products/search?q=widget&store_id=store-123&category=Electronics&condition=new',
      });

      expect(algoliaService.searchProducts).toHaveBeenCalledWith('widget', {
        store_id: 'store-123',
        category: 'Electronics',
        condition: 'new',
      });
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('returns 200 with product', async () => {
      vi.mocked(productRepository.findById).mockResolvedValue(mockProduct);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/products/product-123',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().product.id).toBe('product-123');
    });

    it('returns 404 when product does not exist', async () => {
      vi.mocked(productRepository.findById).mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/products/nonexistent',
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/products/:id', () => {
    it('returns 200 when owner updates their product', async () => {
      const updated = { ...mockProduct, price_cents: 4999 };
      vi.mocked(productRepository.findById).mockResolvedValue(mockProduct);
      vi.mocked(storeRepository.findById).mockResolvedValue(mockStore);
      vi.mocked(productRepository.update).mockResolvedValue(updated);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/products/product-123',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { price_cents: 4999 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().product.price_cents).toBe(4999);
    });

    it('syncs updated product to Algolia', async () => {
      const updated = { ...mockProduct, name: 'New Name' };
      vi.mocked(productRepository.findById).mockResolvedValue(mockProduct);
      vi.mocked(storeRepository.findById).mockResolvedValue(mockStore);
      vi.mocked(productRepository.update).mockResolvedValue(updated);

      await app.inject({
        method: 'PATCH',
        url: '/api/v1/products/product-123',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { name: 'New Name' },
      });

      expect(algoliaService.indexProduct).toHaveBeenCalledWith(updated);
    });

    it('returns 403 when non-owner tries to update', async () => {
      // mockStore.owner_id = 'owner-id', buyer has sub = 'buyer-id'
      vi.mocked(productRepository.findById).mockResolvedValue(mockProduct);
      vi.mocked(storeRepository.findById).mockResolvedValue(mockStore);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/products/product-123',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: { price_cents: 1 },
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 404 when product does not exist', async () => {
      vi.mocked(productRepository.findById).mockResolvedValue(null);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/products/nonexistent',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { price_cents: 999 },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/products/product-123',
        payload: { price_cents: 999 },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/v1/products/:id', () => {
    it('returns 204 when owner soft-deletes product', async () => {
      vi.mocked(productRepository.findById).mockResolvedValue(mockProduct);
      vi.mocked(storeRepository.findById).mockResolvedValue(mockStore);
      vi.mocked(productRepository.softDelete).mockResolvedValue(undefined);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/products/product-123',
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(res.statusCode).toBe(204);
      expect(productRepository.softDelete).toHaveBeenCalledWith('product-123');
    });

    it('removes product from Algolia on soft-delete', async () => {
      vi.mocked(productRepository.findById).mockResolvedValue(mockProduct);
      vi.mocked(storeRepository.findById).mockResolvedValue(mockStore);
      vi.mocked(productRepository.softDelete).mockResolvedValue(undefined);

      await app.inject({
        method: 'DELETE',
        url: '/api/v1/products/product-123',
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(algoliaService.removeProduct).toHaveBeenCalledWith('product-123');
    });

    it('returns 403 when non-owner tries to delete', async () => {
      vi.mocked(productRepository.findById).mockResolvedValue(mockProduct);
      vi.mocked(storeRepository.findById).mockResolvedValue(mockStore);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/products/product-123',
        headers: { authorization: `Bearer ${buyerToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 404 when product does not exist', async () => {
      vi.mocked(productRepository.findById).mockResolvedValue(null);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/products/nonexistent',
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
