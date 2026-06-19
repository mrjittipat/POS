import { create } from 'zustand';

export interface SoldItem {
  product_name: string;
  quantity: number;
  subtotal: number;
  created_at: string;
}

interface NotificationState {
  items: SoldItem[];
  isOpen: boolean;
  setItems: (items: SoldItem[]) => void;
  clearItems: () => void;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  isOpen: false,
  setItems: (items) => set({ items }),
  clearItems: () => set({ items: [] }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (open) => set({ isOpen: open }),
}));
