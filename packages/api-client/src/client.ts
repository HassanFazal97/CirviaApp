import type { AuthTokens } from '@cirvia/types';

import { makeAuthEndpoints } from './endpoints/auth';
import { makeDeliveriesEndpoints } from './endpoints/deliveries';
import { makeDriversEndpoints } from './endpoints/drivers';
import { makeOrdersEndpoints } from './endpoints/orders';
import { makePayoutsEndpoints } from './endpoints/payouts';
import { makeProductsEndpoints } from './endpoints/products';
import { makeReviewsEndpoints } from './endpoints/reviews';
import { makeStoresEndpoints } from './endpoints/stores';
import { makeUsersEndpoints } from './endpoints/users';
import type { ClientConfig, TokenProvider } from './types';

export class CirviaClient {
  readonly baseUrl: string;
  private readonly tokenProvider: TokenProvider | undefined;
  // Serializes concurrent 401 refresh calls so only one refresh fires at a time
  private refreshPromise: Promise<AuthTokens | null> | null = null;

  readonly auth: ReturnType<typeof makeAuthEndpoints>;
  readonly stores: ReturnType<typeof makeStoresEndpoints>;
  readonly products: ReturnType<typeof makeProductsEndpoints>;
  readonly orders: ReturnType<typeof makeOrdersEndpoints>;
  readonly deliveries: ReturnType<typeof makeDeliveriesEndpoints>;
  readonly drivers: ReturnType<typeof makeDriversEndpoints>;
  readonly reviews: ReturnType<typeof makeReviewsEndpoints>;
  readonly payouts: ReturnType<typeof makePayoutsEndpoints>;
  readonly users: ReturnType<typeof makeUsersEndpoints>;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.tokenProvider = config.tokenProvider;

    this.auth = makeAuthEndpoints(this);
    this.stores = makeStoresEndpoints(this);
    this.products = makeProductsEndpoints(this);
    this.orders = makeOrdersEndpoints(this);
    this.deliveries = makeDeliveriesEndpoints(this);
    this.drivers = makeDriversEndpoints(this);
    this.reviews = makeReviewsEndpoints(this);
    this.payouts = makePayoutsEndpoints(this);
    this.users = makeUsersEndpoints(this);
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const accessToken = this.tokenProvider
      ? await this.tokenProvider.getAccessToken()
      : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && this.tokenProvider) {
      const refreshToken = await this.tokenProvider.getRefreshToken();
      if (refreshToken) {
        const newTokens = await this.doRefresh(refreshToken);
        if (newTokens) {
          return this.retry<T>(path, options, newTokens.access_token);
        }
      }
      await this.tokenProvider.onAuthExpired();
      throw new Error('Session expired. Please log in again.');
    }

    return this.parseResponse<T>(res);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async doRefresh(refreshToken: string): Promise<AuthTokens | null> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const res = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!res.ok) {
          await this.tokenProvider?.onAuthExpired();
          return null;
        }

        const data = await res.json();
        const tokens: AuthTokens = data.tokens;
        await this.tokenProvider?.onTokenRefreshed(tokens);
        return tokens;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async retry<T>(
    path: string,
    options: RequestInit,
    accessToken: string,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
      Authorization: `Bearer ${accessToken}`,
    };
    const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
      ...options,
      headers,
    });
    return this.parseResponse<T>(res);
  }

  private async parseResponse<T>(res: Response): Promise<T> {
    if (res.status === 204) return undefined as T;
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(body.message ?? `API error: ${res.status}`);
    }
    return res.json() as Promise<T>;
  }
}

export function createCirviaClient(config: ClientConfig): CirviaClient {
  return new CirviaClient(config);
}
