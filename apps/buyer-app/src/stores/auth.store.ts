import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User, AuthTokens } from '@cirvia/types';

const TOKEN_KEY = 'cirvia_access_token';
const REFRESH_KEY = 'cirvia_refresh_token';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  setAuth: (user: User, tokens: AuthTokens) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadStoredToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,

  setAuth: async (user, tokens) => {
    await SecureStore.setItemAsync(TOKEN_KEY, tokens.access_token);
    await SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh_token);
    set({ user, accessToken: tokens.access_token, isLoading: false });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    set({ user: null, accessToken: null, isLoading: false });
  },

  loadStoredToken: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    set({ accessToken: token, isLoading: false });
    return token;
  },
}));
