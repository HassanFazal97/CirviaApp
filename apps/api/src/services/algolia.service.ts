import algoliasearch from 'algoliasearch';
import { config } from '../config';
import { Product, Store } from '@cirvia/types';

const client = algoliasearch(config.ALGOLIA_APP_ID, config.ALGOLIA_API_KEY);

export const productIndex = client.initIndex('products');
export const storeIndex = client.initIndex('stores');

export const algoliaService = {
  async indexProduct(product: Product): Promise<void> {
    await productIndex.saveObject({
      objectID: product.id,
      id: product.id,
      store_id: product.store_id,
      name: product.name,
      description: product.description,
      category: product.category,
      unit: product.unit,
      price_cents: product.price_cents,
      condition: product.condition,
      is_active: product.is_active,
      image_urls: product.image_urls,
    });
  },

  async removeProduct(productId: string): Promise<void> {
    await productIndex.deleteObject(productId);
  },

  async indexStore(store: Store): Promise<void> {
    await storeIndex.saveObject({
      objectID: store.id,
      id: store.id,
      name: store.name,
      type: store.type,
      description: store.description,
      is_active: store.is_active,
      _geoloc: { lat: store.lat, lng: store.lng },
    });
  },

  async searchProducts(
    query: string,
    filters: { store_id?: string; category?: string; condition?: string } = {}
  ) {
    const filterParts: string[] = ['is_active:true'];

    if (filters.store_id) filterParts.push(`store_id:${filters.store_id}`);
    if (filters.category) filterParts.push(`category:${filters.category}`);
    if (filters.condition) filterParts.push(`condition:${filters.condition}`);

    return productIndex.search(query, {
      filters: filterParts.join(' AND '),
      hitsPerPage: 20,
    });
  },
};
