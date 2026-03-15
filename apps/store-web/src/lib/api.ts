import { createCirviaClient } from '@cirvia/api-client';
import type { OrderDetail, ProductInput, StoreInput } from '@cirvia/api-client';
import type { Order, OrderStatus, PaginatedResponse, Payout, Product, Store } from '@cirvia/types';

export type { OrderDetail, ProductInput, StoreInput };

export const apiClient = createCirviaClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  tokenProvider: {
    getAccessToken: () =>
      typeof window !== 'undefined' ? localStorage.getItem('access_token') : null,
    getRefreshToken: () =>
      typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null,
    onTokenRefreshed: (tokens) => {
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);
    },
    onAuthExpired: () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    },
  },
});

// ─── Named helpers kept for call-site compatibility ───────────────────────────

export const getOrders = (
  storeId: string,
  page = 1,
): Promise<PaginatedResponse<Order>> =>
  apiClient.orders.list({ store_id: storeId, page });

export const getOrder = (orderId: string): Promise<OrderDetail> =>
  apiClient.orders.get(orderId);

export const updateOrderStatus = (
  orderId: string,
  status: OrderStatus,
): Promise<Order> => apiClient.orders.updateStatus(orderId, status);

export const getProducts = (
  storeId: string,
  page = 1,
): Promise<PaginatedResponse<Product>> =>
  apiClient.products.listByStore(storeId, { page });

export const getProduct = (productId: string): Promise<Product> =>
  apiClient.products.get(productId);

export const createProduct = (
  storeId: string,
  data: ProductInput,
): Promise<Product> => apiClient.products.create(storeId, data);

export const updateProduct = (
  productId: string,
  data: Partial<ProductInput>,
): Promise<Product> => apiClient.products.update(productId, data);

export const getPayouts = (
  storeId: string,
  page = 1,
): Promise<PaginatedResponse<Payout>> =>
  apiClient.payouts.listByStore(storeId, { page });

export const getStore = (storeId: string): Promise<Store> =>
  apiClient.stores.get(storeId);

export const updateStore = (
  storeId: string,
  data: StoreInput,
): Promise<Store> => apiClient.stores.update(storeId, data);
