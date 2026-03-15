import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildTestApp } from './helpers/buildTestApp';
import { driverRepository } from '../repositories/driver.repository';
import { orderRepository } from '../repositories/order.repository';
import { acquireLock, releaseLock } from '../redis';

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
  pool: {
    query: vi.fn().mockResolvedValue({
      rows: [
        {
          total_deliveries: '5',
          total_earned_cents: '25000',
          last_7_days_cents: '10000',
        },
      ],
      rowCount: 1,
    }),
  },
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

vi.mock('../websocket/socket.server', () => ({
  getSocketServer: vi.fn().mockReturnValue(null),
  initSocketServer: vi.fn(),
}));

const mockDriver = {
  id: 'driver-123',
  user_id: 'driver-user-id',
  vehicle_type: 'car',
  vehicle_plate: 'ABC123',
  license_number: 'DL123',
  status: 'online',
  is_verified: false,
  current_lat: null,
  current_lng: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
};

const mockDelivery = {
  id: 'delivery-123',
  order_id: 'order-123',
  driver_id: 'driver-123',
  status: 'assigned',
  pickup_address: { line1: '123 Main St', city: 'Austin', state: 'TX', zip: '78701', country: 'US' },
  dropoff_address: { line1: '456 Elm St', city: 'Austin', state: 'TX', zip: '78702', country: 'US' },
  driver_fee_cents: 1200,
  pickup_at: null,
  delivered_at: null,
  proof_photo_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('Drivers routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let driverToken: string;
  let buyerToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp();
    await app.ready();
    driverToken = app.jwt.sign({ sub: 'driver-user-id', email: 'driver@test.com', role: 'driver' });
    buyerToken = app.jwt.sign({ sub: 'buyer-id', email: 'buyer@test.com', role: 'buyer' });
  });

  describe('POST /api/v1/drivers', () => {
    const createBody = { vehicle_type: 'car', vehicle_plate: 'ABC123' };

    it('returns 201 when registering a driver profile', async () => {
      vi.mocked(driverRepository.findByUserId).mockResolvedValue(null);
      vi.mocked(driverRepository.create).mockResolvedValue(mockDriver as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/drivers',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: createBody,
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().driver).toBeDefined();
    });

    it('returns 409 when driver profile already exists', async () => {
      vi.mocked(driverRepository.findByUserId).mockResolvedValue(mockDriver as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/drivers',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: createBody,
      });

      expect(res.statusCode).toBe(409);
    });

    it('returns 400 for invalid vehicle_type', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/drivers',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: { vehicle_type: 'hoverboard' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/drivers',
        payload: createBody,
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/drivers/deliveries/available', () => {
    it('returns 200 with nearby deliveries', async () => {
      vi.mocked(driverRepository.findAvailableNearby).mockResolvedValue([mockDelivery as any]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/drivers/deliveries/available?lat=30.27&lng=-97.74',
        headers: { authorization: `Bearer ${driverToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(1);
    });

    it('returns 400 when lat/lng are missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/drivers/deliveries/available',
        headers: { authorization: `Bearer ${driverToken}` },
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns 403 when non-driver accesses endpoint', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/drivers/deliveries/available?lat=30.27&lng=-97.74',
        headers: { authorization: `Bearer ${buyerToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('defaults radius to 5000m', async () => {
      vi.mocked(driverRepository.findAvailableNearby).mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/api/v1/drivers/deliveries/available?lat=30.27&lng=-97.74',
        headers: { authorization: `Bearer ${driverToken}` },
      });

      expect(driverRepository.findAvailableNearby).toHaveBeenCalledWith(30.27, -97.74, 5000);
    });
  });

  describe('POST /api/v1/drivers/deliveries/:id/accept', () => {
    it('returns 200 when driver successfully accepts delivery', async () => {
      vi.mocked(driverRepository.findByUserId).mockResolvedValue(mockDriver as any);
      vi.mocked(acquireLock).mockResolvedValue(true);
      vi.mocked(driverRepository.assignDriver).mockResolvedValue(mockDelivery as any);
      vi.mocked(driverRepository.updateStatus).mockResolvedValue(undefined);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/drivers/deliveries/delivery-123/accept',
        headers: { authorization: `Bearer ${driverToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().delivery).toBeDefined();
      expect(driverRepository.updateStatus).toHaveBeenCalledWith('driver-123', 'on_delivery');
    });

    it('returns 409 when another driver is already accepting (lock taken)', async () => {
      vi.mocked(driverRepository.findByUserId).mockResolvedValue(mockDriver as any);
      vi.mocked(acquireLock).mockResolvedValue(false);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/drivers/deliveries/delivery-123/accept',
        headers: { authorization: `Bearer ${driverToken}` },
      });

      expect(res.statusCode).toBe(409);
    });

    it('returns 409 when delivery is already taken (assignDriver returns null)', async () => {
      vi.mocked(driverRepository.findByUserId).mockResolvedValue(mockDriver as any);
      vi.mocked(acquireLock).mockResolvedValue(true);
      vi.mocked(driverRepository.assignDriver).mockResolvedValue(null);
      vi.mocked(releaseLock).mockResolvedValue(undefined);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/drivers/deliveries/delivery-123/accept',
        headers: { authorization: `Bearer ${driverToken}` },
      });

      expect(res.statusCode).toBe(409);
      expect(releaseLock).toHaveBeenCalled();
    });

    it('returns 404 when driver profile not found', async () => {
      vi.mocked(driverRepository.findByUserId).mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/drivers/deliveries/delivery-123/accept',
        headers: { authorization: `Bearer ${driverToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 403 for non-driver', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/drivers/deliveries/delivery-123/accept',
        headers: { authorization: `Bearer ${buyerToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('PATCH /api/v1/drivers/deliveries/:id/status', () => {
    it('returns 200 when updating delivery status', async () => {
      const updatedDelivery = { ...mockDelivery, status: 'in_transit' };
      vi.mocked(driverRepository.updateDeliveryStatus).mockResolvedValue(updatedDelivery as any);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/drivers/deliveries/delivery-123/status',
        headers: { authorization: `Bearer ${driverToken}` },
        payload: { status: 'en_route_to_store' },
      });

      expect(res.statusCode).toBe(200);
    });

    it('sets delivered_at timestamp when status is delivered', async () => {
      const updatedDelivery = { ...mockDelivery, status: 'delivered', order_id: 'order-123' };
      vi.mocked(driverRepository.updateDeliveryStatus).mockResolvedValue(updatedDelivery as any);
      vi.mocked(orderRepository.updateStatus).mockResolvedValue(null);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/drivers/deliveries/delivery-123/status',
        headers: { authorization: `Bearer ${driverToken}` },
        payload: { status: 'delivered' },
      });

      expect(res.statusCode).toBe(200);
      expect(orderRepository.updateStatus).toHaveBeenCalledWith('order-123', 'delivered');
      expect(driverRepository.updateDeliveryStatus).toHaveBeenCalledWith(
        'delivery-123',
        'delivered',
        expect.objectContaining({ delivered_at: expect.any(Date) })
      );
    });

    it('sets pickup_at when status is picked_up', async () => {
      vi.mocked(driverRepository.updateDeliveryStatus).mockResolvedValue({
        ...mockDelivery,
        status: 'picked_up',
      } as any);

      await app.inject({
        method: 'PATCH',
        url: '/api/v1/drivers/deliveries/delivery-123/status',
        headers: { authorization: `Bearer ${driverToken}` },
        payload: { status: 'picked_up' },
      });

      expect(driverRepository.updateDeliveryStatus).toHaveBeenCalledWith(
        'delivery-123',
        'picked_up',
        expect.objectContaining({ pickup_at: expect.any(Date) })
      );
    });

    it('returns 404 when delivery not found', async () => {
      vi.mocked(driverRepository.updateDeliveryStatus).mockResolvedValue(null);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/drivers/deliveries/nonexistent/status',
        headers: { authorization: `Bearer ${driverToken}` },
        payload: { status: 'en_route_to_store' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 for invalid status value', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/drivers/deliveries/delivery-123/status',
        headers: { authorization: `Bearer ${driverToken}` },
        payload: { status: 'flying' },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/v1/drivers/location', () => {
    it('returns 204 on successful location update', async () => {
      vi.mocked(driverRepository.findByUserId).mockResolvedValue(mockDriver as any);
      vi.mocked(driverRepository.updateLocation).mockResolvedValue(undefined);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/drivers/location',
        headers: { authorization: `Bearer ${driverToken}` },
        payload: { lat: 30.27, lng: -97.74 },
      });

      expect(res.statusCode).toBe(204);
      expect(driverRepository.updateLocation).toHaveBeenCalledWith('driver-123', 30.27, -97.74);
    });

    it('returns 404 when driver profile not found', async () => {
      vi.mocked(driverRepository.findByUserId).mockResolvedValue(null);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/drivers/location',
        headers: { authorization: `Bearer ${driverToken}` },
        payload: { lat: 30.27, lng: -97.74 },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 when lat is out of range', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/drivers/location',
        headers: { authorization: `Bearer ${driverToken}` },
        payload: { lat: 91, lng: -97.74 },
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns 403 for non-driver', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/drivers/location',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: { lat: 30.27, lng: -97.74 },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/drivers/earnings', () => {
    it('returns 200 with driver earnings', async () => {
      vi.mocked(driverRepository.findByUserId).mockResolvedValue(mockDriver as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/drivers/earnings',
        headers: { authorization: `Bearer ${driverToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.earnings).toBeDefined();
      expect(body.earnings.total_deliveries).toBe('5');
      expect(body.earnings.total_earned_cents).toBe('25000');
    });

    it('returns 404 when driver profile not found', async () => {
      vi.mocked(driverRepository.findByUserId).mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/drivers/earnings',
        headers: { authorization: `Bearer ${driverToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 403 for non-driver', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/drivers/earnings',
        headers: { authorization: `Bearer ${buyerToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });
});
