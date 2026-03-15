import { create } from 'zustand';
import { Product } from '@cirvia/types';

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartState {
  // items grouped by store_id
  itemsByStore: Record<string, CartItem[]>;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearStore: (storeId: string) => void;
  clearAll: () => void;
  getStoreTotal: (storeId: string) => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  itemsByStore: {},

  addItem: (product, quantity = 1) => {
    set((state) => {
      const storeItems = state.itemsByStore[product.store_id] ?? [];
      const existingIdx = storeItems.findIndex((i) => i.product.id === product.id);

      let updatedItems: CartItem[];
      if (existingIdx >= 0) {
        updatedItems = storeItems.map((item, idx) =>
          idx === existingIdx
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        updatedItems = [...storeItems, { product, quantity }];
      }

      return {
        itemsByStore: {
          ...state.itemsByStore,
          [product.store_id]: updatedItems,
        },
      };
    });
  },

  removeItem: (productId) => {
    set((state) => {
      const updated: Record<string, CartItem[]> = {};
      for (const [storeId, items] of Object.entries(state.itemsByStore)) {
        const filtered = items.filter((i) => i.product.id !== productId);
        if (filtered.length > 0) {
          updated[storeId] = filtered;
        }
      }
      return { itemsByStore: updated };
    });
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => {
      const updated: Record<string, CartItem[]> = {};
      for (const [storeId, items] of Object.entries(state.itemsByStore)) {
        updated[storeId] = items.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        );
      }
      return { itemsByStore: updated };
    });
  },

  clearStore: (storeId) => {
    set((state) => {
      const { [storeId]: _, ...rest } = state.itemsByStore;
      return { itemsByStore: rest };
    });
  },

  clearAll: () => set({ itemsByStore: {} }),

  getStoreTotal: (storeId) => {
    const items = get().itemsByStore[storeId] ?? [];
    return items.reduce(
      (sum, item) => sum + item.product.price_cents * item.quantity,
      0
    );
  },

  getItemCount: () => {
    return Object.values(get().itemsByStore).reduce(
      (total, items) => total + items.reduce((s, i) => s + i.quantity, 0),
      0
    );
  },
}));
