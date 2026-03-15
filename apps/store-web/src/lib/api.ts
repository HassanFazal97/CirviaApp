import type {
  Order,
  OrderItem,
  OrderStatus,
  Product,
  ProductCondition,
  Payout,
  Store,
  PaginatedResponse,
} from '@cirvia/types';

export type OrderDetail = Order & { items?: OrderItem[] };

export type ProductInput = {
  name: string;
  description?: string;
  sku?: string;
  category: string;
  unit: string;
  price_cents: number;
  stock: number;
  condition: ProductCondition;
  is_active: boolean;
};

export type StoreInput = {
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function apiFetch<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export function getOrders(
  storeId: string,
  token: string,
  page = 1,
): Promise<PaginatedResponse<Order>> {
  return apiFetch(`/orders?store_id=${storeId}&page=${page}`, token);
}

export function getOrder(id: string, token: string): Promise<OrderDetail> {
  return apiFetch(`/orders/${id}`, token);
}

export function updateOrderStatus(
  id: string,
  status: OrderStatus,
  token: string,
): Promise<Order> {
  return apiFetch(`/orders/${id}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function getProducts(
  storeId: string,
  token: string,
  page = 1,
): Promise<PaginatedResponse<Product>> {
  return apiFetch(`/stores/${storeId}/products?page=${page}`, token);
}

export function getProduct(id: string, token: string): Promise<Product> {
  return apiFetch(`/products/${id}`, token);
}

export function createProduct(
  storeId: string,
  data: ProductInput,
  token: string,
): Promise<Product> {
  return apiFetch(`/stores/${storeId}/products`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateProduct(
  id: string,
  data: Partial<ProductInput>,
  token: string,
): Promise<Product> {
  return apiFetch(`/products/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function getPayouts(
  storeId: string,
  token: string,
  page = 1,
): Promise<PaginatedResponse<Payout>> {
  return apiFetch(`/stores/${storeId}/payouts?page=${page}`, token);
}

export function getStore(storeId: string, token: string): Promise<Store> {
  return apiFetch(`/stores/${storeId}`, token);
}

export function updateStore(
  storeId: string,
  data: StoreInput,
  token: string,
): Promise<Store> {
  return apiFetch(`/stores/${storeId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
