import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import { io as ioc } from 'socket.io-client';
import { getSocketServer, initSocketServer } from '../websocket/socket.server';
import { driverRepository } from '../repositories/driver.repository';

// Must be a string literal in vi.mock factories (hoisted above const declarations)
const JWT_SECRET = 'test-jwt-secret-for-websocket-tests-!!!!';

vi.mock('../config', () => ({
  config: {
    JWT_SECRET: 'test-jwt-secret-for-websocket-tests-!!!!',
    CORS_ORIGIN: '*',
    NODE_ENV: 'test',
    PORT: 3001,
    DATABASE_URL: 'postgres://localhost/test',
    REDIS_URL: 'redis://localhost',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
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
  },
}));

vi.mock('../repositories/driver.repository', () => ({
  driverRepository: {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findDeliveryById: vi.fn(),
    updateLocation: vi.fn(),
    updateStatus: vi.fn(),
    create: vi.fn(),
    assignDriver: vi.fn(),
    createDelivery: vi.fn(),
    findAvailableNearby: vi.fn(),
    findDeliveryByOrder: vi.fn(),
    updateDeliveryStatus: vi.fn(),
  },
}));

function makeToken(payload: { sub: string; email: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

function waitFor(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Socket server module', () => {
  describe('getSocketServer', () => {
    it('returns null or a server depending on initialization state', () => {
      const result = getSocketServer();
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });

  describe('initSocketServer', () => {
    let httpServer: ReturnType<typeof createServer>;

    afterEach(() => {
      httpServer?.close();
    });

    it('returns a Socket.io server instance', () => {
      httpServer = createServer();
      const io = initSocketServer(httpServer);

      expect(io).toBeDefined();
      expect(typeof io.on).toBe('function');
      expect(typeof io.to).toBe('function');
    });

    it('makes the server accessible via getSocketServer()', () => {
      httpServer = createServer();
      const io = initSocketServer(httpServer);

      expect(getSocketServer()).toBe(io);
    });
  });
});

describe('Socket JWT auth middleware', () => {
  let httpServer: ReturnType<typeof createServer>;
  let port: number;

  beforeEach(async () => {
    vi.clearAllMocks();
    httpServer = createServer();
    initSocketServer(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => {
        port = (httpServer.address() as { port: number }).port;
        resolve();
      });
    });
  });

  afterEach(() => {
    httpServer.close();
  });

  it('rejects connection when no token is provided', async () => {
    const client = ioc(`http://127.0.0.1:${port}`, {
      auth: {}, // no token
      transports: ['websocket'],
      timeout: 2000,
    });

    const error = await new Promise<Error>((resolve) => {
      client.on('connect_error', (err) => {
        client.disconnect();
        resolve(err);
      });
    });

    expect(error.message).toBe('Authentication required');
  });

  it('rejects connection with an invalid JWT token', async () => {
    const client = ioc(`http://127.0.0.1:${port}`, {
      auth: { token: 'this-is-not-a-jwt' },
      transports: ['websocket'],
      timeout: 2000,
    });

    const error = await new Promise<Error>((resolve) => {
      client.on('connect_error', (err) => {
        client.disconnect();
        resolve(err);
      });
    });

    expect(error.message).toBe('Invalid token');
  });

  it('rejects connection with JWT signed by the wrong secret', async () => {
    const wrongToken = jwt.sign({ sub: 'user-123', role: 'buyer' }, 'wrong-secret');
    const client = ioc(`http://127.0.0.1:${port}`, {
      auth: { token: wrongToken },
      transports: ['websocket'],
      timeout: 2000,
    });

    const error = await new Promise<Error>((resolve) => {
      client.on('connect_error', (err) => {
        client.disconnect();
        resolve(err);
      });
    });

    expect(error.message).toBe('Invalid token');
  });

  it('accepts connection with a valid JWT token', async () => {
    const token = makeToken({ sub: 'user-123', email: 'buyer@test.com', role: 'buyer' });
    const client = ioc(`http://127.0.0.1:${port}`, {
      auth: { token },
      transports: ['websocket'],
      timeout: 2000,
    });

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => {
        client.disconnect();
        resolve();
      });
      client.on('connect_error', reject);
    });
  });
});

describe('Socket event handlers', () => {
  let httpServer: ReturnType<typeof createServer>;
  let port: number;

  beforeEach(async () => {
    vi.clearAllMocks();
    httpServer = createServer();
    initSocketServer(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => {
        port = (httpServer.address() as { port: number }).port;
        resolve();
      });
    });
  });

  afterEach(() => {
    httpServer.close();
  });

  function connect(role: string, sub: string) {
    const token = makeToken({ sub, email: `${role}@test.com`, role });
    return ioc(`http://127.0.0.1:${port}`, {
      auth: { token },
      transports: ['websocket'],
      timeout: 2000,
    });
  }

  it('buyer can subscribe and unsubscribe from order rooms', async () => {
    const io = getSocketServer()!;
    const client = connect('buyer', 'buyer-123');

    await new Promise<void>((resolve, reject) => {
      client.on('connect', resolve);
      client.on('connect_error', reject);
    });

    client.emit('order:subscribe', 'order-abc');
    await waitFor(50);

    // Verify the server knows about the room
    const room = io.sockets.adapter.rooms.get('order:order-abc');
    expect(room).toBeDefined();
    expect(room!.size).toBeGreaterThan(0);

    client.emit('order:unsubscribe', 'order-abc');
    await waitFor(50);

    const roomAfter = io.sockets.adapter.rooms.get('order:order-abc');
    expect(roomAfter === undefined || roomAfter.size === 0).toBe(true);

    client.disconnect();
  });

  it('store_owner can subscribe to a store room', async () => {
    const io = getSocketServer()!;
    const client = connect('store_owner', 'owner-123');

    await new Promise<void>((resolve, reject) => {
      client.on('connect', resolve);
      client.on('connect_error', reject);
    });

    client.emit('store:subscribe', 'store-abc');
    await waitFor(50);

    const room = io.sockets.adapter.rooms.get('store:store-abc');
    expect(room).toBeDefined();
    expect(room!.size).toBeGreaterThan(0);

    client.disconnect();
  });

  it('driver automatically joins their driver room on connect', async () => {
    const io = getSocketServer()!;
    const client = connect('driver', 'driver-user-123');

    await new Promise<void>((resolve, reject) => {
      client.on('connect', resolve);
      client.on('connect_error', reject);
    });

    await waitFor(50);

    const room = io.sockets.adapter.rooms.get('driver:driver-user-123');
    expect(room).toBeDefined();
    expect(room!.size).toBeGreaterThan(0);

    client.disconnect();
  });

  it('driver location_update event persists location to DB', async () => {
    vi.mocked(driverRepository.findDeliveryById).mockResolvedValue({
      id: 'delivery-123',
      order_id: 'order-abc',
      driver_id: 'driver-123',
    } as any);
    vi.mocked(driverRepository.findByUserId).mockResolvedValue({
      id: 'driver-123',
      user_id: 'driver-user-123',
    } as any);
    vi.mocked(driverRepository.updateLocation).mockResolvedValue(undefined);

    const client = connect('driver', 'driver-user-123');

    await new Promise<void>((resolve, reject) => {
      client.on('connect', resolve);
      client.on('connect_error', reject);
    });

    client.emit('driver:location_update', {
      delivery_id: 'delivery-123',
      lat: 30.27,
      lng: -97.74,
    });

    await waitFor(100);

    expect(driverRepository.findDeliveryById).toHaveBeenCalledWith('delivery-123');
    expect(driverRepository.findByUserId).toHaveBeenCalledWith('driver-user-123');
    expect(driverRepository.updateLocation).toHaveBeenCalledWith('driver-123', 30.27, -97.74);

    client.disconnect();
  });

  it('driver location_update broadcasts to the order room', async () => {
    vi.mocked(driverRepository.findDeliveryById).mockResolvedValue({
      id: 'delivery-123',
      order_id: 'order-abc',
    } as any);
    vi.mocked(driverRepository.findByUserId).mockResolvedValue(null);
    vi.mocked(driverRepository.updateLocation).mockResolvedValue(undefined);

    const driverClient = connect('driver', 'driver-user-123');
    const buyerClient = connect('buyer', 'buyer-123');

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        driverClient.on('connect', resolve);
        driverClient.on('connect_error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        buyerClient.on('connect', resolve);
        buyerClient.on('connect_error', reject);
      }),
    ]);

    // Buyer subscribes to the order room
    buyerClient.emit('order:subscribe', 'order-abc');
    await waitFor(50);

    // Driver sends a location update
    const locationUpdate = await new Promise<any>((resolve) => {
      buyerClient.on('driver:location_update', resolve);
      driverClient.emit('driver:location_update', {
        delivery_id: 'delivery-123',
        lat: 30.27,
        lng: -97.74,
      });
    });

    expect(locationUpdate.lat).toBe(30.27);
    expect(locationUpdate.lng).toBe(-97.74);
    expect(locationUpdate.delivery_id).toBe('delivery-123');

    driverClient.disconnect();
    buyerClient.disconnect();
  });
});
