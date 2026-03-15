import type { PaginatedResponse, Review } from '@cirvia/types';

import type { CirviaClient } from '../client';
import type { CreateReviewInput } from '../types';

export function makeReviewsEndpoints(client: CirviaClient) {
  return {
    list(params?: {
      target_type?: 'store' | 'driver';
      target_id?: string;
      page?: number;
    }): Promise<PaginatedResponse<Review>> {
      const q = new URLSearchParams();
      if (params?.target_type) q.set('target_type', params.target_type);
      if (params?.target_id) q.set('target_id', params.target_id);
      if (params?.page != null) q.set('page', String(params.page));
      const qs = q.toString();
      return client.request(`/reviews${qs ? `?${qs}` : ''}`);
    },

    get(reviewId: string): Promise<Review> {
      return client.request(`/reviews/${reviewId}`);
    },

    create(orderId: string, data: CreateReviewInput): Promise<Review> {
      return client.request(`/orders/${orderId}/review`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  };
}
