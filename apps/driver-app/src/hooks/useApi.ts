import { useAuthStore } from '../stores/auth.store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export function useApi() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const user = useAuthStore((s) => s.user);

  async function request<T>(
    path: string,
    options: RequestInit = {},
    retry = true
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const res = await fetch(`${API_BASE}/api/v1${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && retry && refreshToken) {
      // Attempt token refresh
      const refreshRes = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        if (user) {
          await setAuth(user, data.tokens);
        }
        // Retry original request once with new token
        return request<T>(path, options, false);
      } else {
        await clearAuth();
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message ?? 'Request failed');
    }

    return res.json() as Promise<T>;
  }

  return { request };
}
