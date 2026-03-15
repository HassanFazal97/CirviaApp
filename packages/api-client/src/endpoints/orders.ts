import type { Order, OrderItem, OrderStatus, PaginatedResponse } from '@cirvia/types';

import type { CirviaClient } from '../client';
import type { CreateOrderInput } from '../types';

export type OrderDetail = Order & { items?: OrderItem[] };

export function makeOrdersEndpoints(client: CirviaClient) {
  return {
    list(params?: {
      store_id?: string;
      buyer_id?: string;
      status?: OrderStatus;
      page?: number;
    }): Promise<PaginatedResponse<Order>> {
      const q = new URLSearchParams();
      if (params?.store_id) q.set('store_id', params.store_id);
      if (params?.buyer_id) q.set('buyer_id', params.buyer_id);
      if (params?.status) q.set('status', params.status);
      if (params?.page != null) q.set('page', String(params.page));
      const qs = q.toString();
      return client.request(`/orders${qs ? `?${qs}` : ''}`);
    },

    get(orderId: string): Promise<OrderDetail> {
      return client.request(`/orders/${orderId}`);
    },

    create(data: CreateOrderInput): Promise<Order> {
      return client.request('/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateStatus(orderId: string, status: OrderStatus): Promise<Order> {
      return client.request(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },

    cancel(orderId: string): Promise<Order> {
      return client.request(`/orders/${orderId}/cancel`, { method: 'POST' });
    },
  };
}
