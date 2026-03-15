import type { Delivery, DeliveryStatus, PaginatedResponse } from '@cirvia/types';

import type { CirviaClient } from '../client';

export function makeDeliveriesEndpoints(client: CirviaClient) {
  return {
    list(params?: {
      driver_id?: string;
      status?: DeliveryStatus;
      page?: number;
    }): Promise<PaginatedResponse<Delivery>> {
      const q = new URLSearchParams();
      if (params?.driver_id) q.set('driver_id', params.driver_id);
      if (params?.status) q.set('status', params.status);
      if (params?.page != null) q.set('page', String(params.page));
      const qs = q.toString();
      return client.request(`/deliveries${qs ? `?${qs}` : ''}`);
    },

    get(deliveryId: string): Promise<Delivery> {
      return client.request(`/deliveries/${deliveryId}`);
    },

    getByOrder(orderId: string): Promise<Delivery> {
      return client.request(`/orders/${orderId}/delivery`);
    },

    updateStatus(deliveryId: string, status: DeliveryStatus): Promise<Delivery> {
      return client.request(`/deliveries/${deliveryId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },

    uploadProof(deliveryId: string, formData: FormData): Promise<Delivery> {
      return client.request(`/deliveries/${deliveryId}/proof`, {
        method: 'POST',
        // FormData sets its own Content-Type with boundary; let fetch handle it
        headers: {},
        body: formData,
      });
    },
  };
}
