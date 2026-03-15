import type { AuthResponse, AuthTokens, User } from '@cirvia/types';

import type { CirviaClient } from '../client';
import type { LoginInput, RegisterInput } from '../types';

export function makeAuthEndpoints(client: CirviaClient) {
  return {
    register(input: RegisterInput): Promise<AuthResponse> {
      return client.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    login(input: LoginInput): Promise<AuthResponse> {
      return client.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    refresh(refreshToken: string): Promise<{ tokens: AuthTokens }> {
      return client.request('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    },

    logout(): Promise<void> {
      return client.request('/auth/logout', { method: 'POST' });
    },

    me(): Promise<User> {
      return client.request('/auth/me');
    },
  };
}
