export function useAuth() {
  const storeId =
    typeof window !== 'undefined' ? (localStorage.getItem('store_id') ?? '') : '';
  const token =
    typeof window !== 'undefined' ? (localStorage.getItem('access_token') ?? '') : '';
  return { storeId, token, isAuthenticated: !!(storeId && token) };
}
