import type { PaginatedResponse, Product } from '@cirvia/types';

import type { CirviaClient } from '../client';
import type { ProductInput } from '../types';

export function makeProductsEndpoints(client: CirviaClient) {
  return {
    listByStore(
      storeId: string,
      params?: { page?: number },
    ): Promise<PaginatedResponse<Product>> {
      const q = new URLSearchParams();
      if (params?.page != null) q.set('page', String(params.page));
      const qs = q.toString();
      return client.request(`/stores/${storeId}/products${qs ? `?${qs}` : ''}`);
    },

    get(productId: string): Promise<Product> {
      return client.request(`/products/${productId}`);
    },

    create(storeId: string, data: ProductInput): Promise<Product> {
      return client.request(`/stores/${storeId}/products`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update(productId: string, data: Partial<ProductInput>): Promise<Product> {
      return client.request(`/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete(productId: string): Promise<void> {
      return client.request(`/products/${productId}`, { method: 'DELETE' });
    },
  };
}
