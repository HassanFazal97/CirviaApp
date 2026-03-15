import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../services/auth.service';
import { userRepository } from '../repositories/user.repository';
import { redis } from '../redis';

vi.mock('../db', () => ({
  supabase: {
    auth: {
      admin: {
        createUser: vi.fn(),
      },
      signInWithPassword: vi.fn(),
    },
  },
  pool: { query: vi.fn() },
}));

vi.mock('../redis', () => ({
  redis: {
    setex: vi.fn().mockResolvedValue('OK'),
    get: vi.fn(),
    del: vi.fn().mockResolvedValue(1),
    set: vi.fn(),
  },
  TTL: { REFRESH_TOKEN: 2592000 },
}));

vi.mock('../repositories/user.repository', () => ({
  userRepository: {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

const mockUser = {
  id: 'user-123',
  email: 'user@test.com',
  full_name: 'Test User',
  role: 'buyer' as const,
  phone: null,
  avatar_url: null,
  push_token: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
};

const mockFastify = {
  jwt: {
    sign: vi.fn().mockReturnValue('access-token-xyz'),
  },
} as any;

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('creates Supabase user, local profile, and returns tokens', async () => {
      const { supabase } = await import('../db');
      vi.mocked(supabase.auth.admin.createUser).mockResolvedValue({
        data: { user: { id: 'supabase-user-id' } },
        error: null,
      } as any);
      vi.mocked(userRepository.create).mockResolvedValue(mockUser);
      vi.mocked(redis.setex).mockResolvedValue('OK' as any);

      const result = await authService.register(mockFastify, {
        email: 'user@test.com',
        password: 'password123',
        full_name: 'Test User',
        role: 'buyer',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.tokens.access_token).toBe('access-token-xyz');
      expect(result.tokens.refresh_token).toBeDefined();
      expect(result.tokens.expires_in).toBe(900); // 15 minutes
    });

    it('creates Supabase user with email_confirm: true', async () => {
      const { supabase } = await import('../db');
      vi.mocked(supabase.auth.admin.createUser).mockResolvedValue({
        data: { user: { id: 'supabase-user-id' } },
        error: null,
      } as any);
      vi.mocked(userRepository.create).mockResolvedValue(mockUser);

      await authService.register(mockFastify, {
        email: 'user@test.com',
        password: 'password123',
        full_name: 'Test User',
        role: 'buyer',
      });

      expect(supabase.auth.admin.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ email_confirm: true })
      );
    });

    it('throws when Supabase auth creation fails', async () => {
      const { supabase } = await import('../db');
      vi.mocked(supabase.auth.admin.createUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already registered' },
      } as any);

      await expect(
        authService.register(mockFastify, {
          email: 'taken@test.com',
          password: 'password123',
          full_name: 'Test User',
          role: 'buyer',
        })
      ).rejects.toThrow('Email already registered');
    });

    it('uses Supabase user ID as local user ID', async () => {
      const { supabase } = await import('../db');
      vi.mocked(supabase.auth.admin.createUser).mockResolvedValue({
        data: { user: { id: 'supabase-abc-123' } },
        error: null,
      } as any);
      vi.mocked(userRepository.create).mockResolvedValue(mockUser);

      await authService.register(mockFastify, {
        email: 'user@test.com',
        password: 'password123',
        full_name: 'Test User',
        role: 'buyer',
      });

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'supabase-abc-123' })
      );
    });
  });

  describe('login', () => {
    it('returns user and tokens on valid credentials', async () => {
      const { supabase } = await import('../db');
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as any);
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);

      const result = await authService.login(mockFastify, {
        email: 'user@test.com',
        password: 'password123',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.tokens.access_token).toBeDefined();
    });

    it('throws when Supabase rejects credentials', async () => {
      const { supabase } = await import('../db');
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      } as any);

      await expect(
        authService.login(mockFastify, { email: 'bad@test.com', password: 'wrong' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('throws when user profile not found in local DB', async () => {
      const { supabase } = await import('../db');
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as any);
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(
        authService.login(mockFastify, { email: 'user@test.com', password: 'password123' })
      ).rejects.toThrow('User profile not found');
    });
  });

  describe('refresh', () => {
    it('rotates refresh token and returns new tokens', async () => {
      vi.mocked(redis.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(redis.del).mockResolvedValue(1 as any);
      vi.mocked(redis.setex).mockResolvedValue('OK' as any);

      const result = await authService.refresh(mockFastify, 'old-refresh-token');

      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(redis.del).toHaveBeenCalledWith('refresh:old-refresh-token');
    });

    it('throws when refresh token is not in Redis', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);

      await expect(authService.refresh(mockFastify, 'invalid-token')).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });

    it('throws when user no longer exists', async () => {
      vi.mocked(redis.get).mockResolvedValue('deleted-user-id');
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(authService.refresh(mockFastify, 'valid-refresh-token')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('logout', () => {
    it('deletes refresh token from Redis', async () => {
      vi.mocked(redis.del).mockResolvedValue(1 as any);

      await authService.logout('some-refresh-token');

      expect(redis.del).toHaveBeenCalledWith('refresh:some-refresh-token');
    });
  });

  describe('generateTokens', () => {
    it('stores refresh token in Redis with correct TTL', async () => {
      vi.mocked(redis.setex).mockResolvedValue('OK' as any);

      await authService.generateTokens(mockFastify, mockUser);

      expect(redis.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^refresh:/),
        2592000, // TTL.REFRESH_TOKEN
        mockUser.id
      );
    });

    it('returns expires_in of 15 minutes (900 seconds)', async () => {
      vi.mocked(redis.setex).mockResolvedValue('OK' as any);

      const tokens = await authService.generateTokens(mockFastify, mockUser);

      expect(tokens.expires_in).toBe(900);
    });

    it('includes correct payload in JWT sign call', async () => {
      vi.mocked(redis.setex).mockResolvedValue('OK' as any);

      await authService.generateTokens(mockFastify, mockUser);

      expect(mockFastify.jwt.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('generates a unique UUID for each refresh token', async () => {
      vi.mocked(redis.setex).mockResolvedValue('OK' as any);

      const tokens1 = await authService.generateTokens(mockFastify, mockUser);
      const tokens2 = await authService.generateTokens(mockFastify, mockUser);

      expect(tokens1.refresh_token).not.toBe(tokens2.refresh_token);
    });
  });
});
