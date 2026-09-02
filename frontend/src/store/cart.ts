import { create } from 'zustand';
import type { CartItem } from '../api/pos.api';
import type { Product } from '../api/products.api';

interface CartState {
  items: CartItem[];
  addToCart: (product: Product) => void;
  updateQuantity: (productId: number, delta: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  setItems: (items: CartItem[]) => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],

  addToCart: (product) =>
    set((state) => {
      const existing = state.items.find((item) => item.product_id === product.id);
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.product_id === product.id
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  subtotal: (item.quantity + 1) * item.price - item.discount,
                }
              : item
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            product_id: product.id,
            product_name: product.name,
            barcode: product.barcode,
            price: product.price,
            quantity: 1,
            discount: 0,
            subtotal: product.price,
          },
        ],
      };
    }),

  updateQuantity: (productId, delta) =>
    set((state) => ({
      items: state.items
        .map((item) =>
          item.product_id === productId
            ? {
                ...item,
                quantity: Math.max(1, item.quantity + delta),
                subtotal: Math.max(1, item.quantity + delta) * item.price - item.discount,
              }
            : item
        )
        .filter((item) => item.quantity >= 1),
    })),

  removeItem: (productId) =>
    set((state) => ({ items: state.items.filter((item) => item.product_id !== productId) })),

  clearCart: () => set({ items: [] }),

  setItems: (items) => set({ items }),
}));
