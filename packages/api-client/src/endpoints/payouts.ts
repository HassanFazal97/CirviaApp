import type { PaginatedResponse, Payout, PayoutRecipientType } from '@cirvia/types';

import type { CirviaClient } from '../client';

export function makePayoutsEndpoints(client: CirviaClient) {
  return {
    list(params?: {
      recipient_type?: PayoutRecipientType;
      recipient_id?: string;
      page?: number;
    }): Promise<PaginatedResponse<Payout>> {
      const q = new URLSearchParams();
      if (params?.recipient_type) q.set('recipient_type', params.recipient_type);
      if (params?.recipient_id) q.set('recipient_id', params.recipient_id);
      if (params?.page != null) q.set('page', String(params.page));
      const qs = q.toString();
      return client.request(`/payouts${qs ? `?${qs}` : ''}`);
    },

    listByStore(storeId: string, params?: { page?: number }): Promise<PaginatedResponse<Payout>> {
      const q = new URLSearchParams();
      if (params?.page != null) q.set('page', String(params.page));
      const qs = q.toString();
      return client.request(`/stores/${storeId}/payouts${qs ? `?${qs}` : ''}`);
    },

    get(payoutId: string): Promise<Payout> {
      return client.request(`/payouts/${payoutId}`);
    },
  };
}
