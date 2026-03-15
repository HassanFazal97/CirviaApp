import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../server';

// Mock external dependencies so tests run without real services
vi.mock('../db', () => ({
  supabase: {
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
      },
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
  },
  pool: {
    query: vi.fn(),
  },
}));

vi.mock('../redis', () => ({
  redis: {
    setex: vi.fn().mockResolvedValue('OK'),
    get: vi.fn(),
    del: vi.fn(),
    set: vi.fn(),
  },
  TTL: { REFRESH_TOKEN: 2592000 },
  acquireLock: vi.fn(),
  releaseLock: vi.fn(),
}));

vi.mock('../repositories/user.repository', () => ({
  userRepository: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn().mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'buyer',
      phone: null,
      avatar_url: null,
      push_token: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }),
    update: vi.fn(),
  },
}));

vi.mock('../queues/stock.queue', () => ({
  stockRestoreQueue: { add: vi.fn() },
  stockRestoreWorker: { close: vi.fn(), on: vi.fn() },
}));

vi.mock('../services/algolia.service', () => ({
  algoliaService: {
    indexProduct: vi.fn(),
    indexStore: vi.fn(),
    removeProduct: vi.fn(),
    searchProducts: vi.fn().mockResolvedValue({ hits: [], nbHits: 0, page: 0, nbPages: 0 }),
  },
}));

describe('Auth endpoints', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp();
    await app.ready();
  });

  it('POST /api/v1/auth/register returns 201 with user and tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'buyer@example.com',
        password: 'securepassword',
        full_name: 'John Builder',
        role: 'buyer',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user).toBeDefined();
    expect(body.tokens.access_token).toBeDefined();
    expect(body.tokens.refresh_token).toBeDefined();
  });

  it('POST /api/v1/auth/register rejects invalid role', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'user@example.com',
        password: 'securepassword',
        full_name: 'Bad Role',
        role: 'admin', // admin cannot self-register
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('POST /api/v1/auth/register rejects weak password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'user@example.com',
        password: 'short',
        full_name: 'Test User',
        role: 'buyer',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('GET /health returns 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
  });
});
