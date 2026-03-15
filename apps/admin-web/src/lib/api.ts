import { createCirviaClient } from '@cirvia/api-client';

export const apiClient = createCirviaClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  tokenProvider: {
    getAccessToken: () =>
      typeof window !== 'undefined' ? localStorage.getItem('access_token') : null,
    getRefreshToken: () => null,
    onTokenRefreshed: () => {},
    onAuthExpired: () => {},
  },
});
