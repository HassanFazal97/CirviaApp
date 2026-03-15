import { createCirviaClient } from '@cirvia/api-client';

import { useAuthStore } from '../stores/auth.store';

// Module-level singleton — reads tokens from Zustand store at request time via
// getState() so it always has the current value without needing a React hook.
export const apiClient = createCirviaClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001',
  tokenProvider: {
    getAccessToken: () => useAuthStore.getState().accessToken,
    getRefreshToken: () => useAuthStore.getState().refreshToken,
    onTokenRefreshed: async (tokens) => {
      const { user, setAuth } = useAuthStore.getState();
      if (user) await setAuth(user, tokens);
    },
    onAuthExpired: async () => {
      await useAuthStore.getState().clearAuth();
    },
  },
});
