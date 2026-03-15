import type { Driver, PaginatedResponse } from '@cirvia/types';

import type { CirviaClient } from '../client';
import type { UpdateDriverStatusInput } from '../types';

export function makeDriversEndpoints(client: CirviaClient) {
  return {
    list(params?: { page?: number }): Promise<PaginatedResponse<Driver>> {
      const q = new URLSearchParams();
      if (params?.page != null) q.set('page', String(params.page));
      const qs = q.toString();
      return client.request(`/drivers${qs ? `?${qs}` : ''}`);
    },

    get(driverId: string): Promise<Driver> {
      return client.request(`/drivers/${driverId}`);
    },

    me(): Promise<Driver> {
      return client.request('/drivers/me');
    },

    updateStatus(data: UpdateDriverStatusInput): Promise<Driver> {
      return client.request('/drivers/me/status', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    updateLocation(lat: number, lng: number): Promise<void> {
      return client.request('/drivers/me/location', {
        method: 'PATCH',
        body: JSON.stringify({ lat, lng }),
      });
    },
  };
}
