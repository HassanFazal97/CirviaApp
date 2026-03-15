import { useAuthStore } from '../stores/auth.store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export function useApi() {
  const accessToken = useAuthStore((s) => s.accessToken);

  async function request<T>(
    path: string,
    options: RequestInit = {}
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

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message ?? 'Request failed');
    }

    return res.json() as Promise<T>;
  }

  return { request };
}
