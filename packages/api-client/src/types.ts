import type { AuthTokens, ProductCondition, UserRole } from '@cirvia/types';

// ─── Token Provider ───────────────────────────────────────────────────────────
// Implemented by each app using its own storage (localStorage, SecureStore, etc.)

export interface TokenProvider {
  getAccessToken(): string | null | Promise<string | null>;
  getRefreshToken(): string | null | Promise<string | null>;
  onTokenRefreshed(tokens: AuthTokens): void | Promise<void>;
  onAuthExpired(): void | Promise<void>;
}

export interface ClientConfig {
  baseUrl: string;
  tokenProvider?: TokenProvider;
}

// ─── Auth Input Types ─────────────────────────────────────────────────────────

export interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
  role: Extract<UserRole, 'buyer' | 'store_owner' | 'driver'>;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ─── Store Input Types ────────────────────────────────────────────────────────

export interface StoreInput {
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
}

// ─── Product Input Types ──────────────────────────────────────────────────────

export interface ProductInput {
  name: string;
  description?: string;
  sku?: string;
  category: string;
  unit: string;
  price_cents: number;
  stock: number;
  condition: ProductCondition;
  is_active: boolean;
}

// ─── Order Input Types ────────────────────────────────────────────────────────

export interface CreateOrderInput {
  store_id: string;
  delivery_address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    lat?: number;
    lng?: number;
  };
  delivery_notes?: string;
  items: Array<{ product_id: string; quantity: number }>;
}

// ─── Driver Input Types ───────────────────────────────────────────────────────

export interface UpdateDriverStatusInput {
  status: 'offline' | 'online' | 'on_delivery';
}

// ─── Review Input Types ───────────────────────────────────────────────────────

export interface CreateReviewInput {
  target_type: 'store' | 'driver';
  target_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}

// ─── User Input Types ─────────────────────────────────────────────────────────

export interface UpdateProfileInput {
  full_name?: string;
  phone?: string;
  push_token?: string;
}
