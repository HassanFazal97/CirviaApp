import { apiClient } from '../lib/apiClient';

// Thin hook kept for call-site compatibility.
// Use `apiClient` directly for new code.
export function useApi() {
  return { request: apiClient.request.bind(apiClient) };
}
