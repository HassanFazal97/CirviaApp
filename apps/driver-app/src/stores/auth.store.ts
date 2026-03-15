import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User, AuthTokens } from '@cirvia/types';

const STORAGE_KEY = 'cirvia_driver_auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setAuth: (user: User, tokens: AuthTokens) => Promise<void>;
  clearAuth: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isHydrated: false,

  setAuth: async (user, tokens) => {
    await SecureStore.setItemAsync(
      STORAGE_KEY,
      JSON.stringify({
        user,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      })
    );
    set({
      user,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      isAuthenticated: true,
    });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (raw) {
        const { user, accessToken, refreshToken } = JSON.parse(raw);
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      }
    } catch {
      // Corrupted storage — start fresh
    } finally {
      set({ isHydrated: true });
    }
  },
}));
