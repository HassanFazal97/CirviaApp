import type { PaginatedResponse, Store, StoreWithDistance } from '@cirvia/types';

import type { CirviaClient } from '../client';
import type { StoreInput } from '../types';

export function makeStoresEndpoints(client: CirviaClient) {
  return {
    list(params?: {
      lat?: number;
      lng?: number;
      radius_km?: number;
      page?: number;
    }): Promise<PaginatedResponse<StoreWithDistance>> {
      const q = new URLSearchParams();
      if (params?.lat != null) q.set('lat', String(params.lat));
      if (params?.lng != null) q.set('lng', String(params.lng));
      if (params?.radius_km != null) q.set('radius_km', String(params.radius_km));
      if (params?.page != null) q.set('page', String(params.page));
      const qs = q.toString();
      return client.request(`/stores${qs ? `?${qs}` : ''}`);
    },

    get(storeId: string): Promise<Store> {
      return client.request(`/stores/${storeId}`);
    },

    update(storeId: string, data: Partial<StoreInput>): Promise<Store> {
      return client.request(`/stores/${storeId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
  };
}
