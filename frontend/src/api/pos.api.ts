import api from './axios';

export interface CartItem {
  product_id: number;
  product_name: string;
  barcode: string | null;
  price: number;
  quantity: number;
  discount: number;
  subtotal: number;
}

export interface CheckoutRequest {
  items: CartItem[];
  discount_amount: number;
  discount_type: 'percent' | 'fixed';
  vat_rate: number;
  payments: {
    method: 'cash' | 'promptpay';
    amount: number;
    reference?: string;
  }[];
}

export const posApi = {
  checkout: (data: CheckoutRequest) => api.post('/pos/checkout', data),
  resetSales: (scope: 'today' | 'all' = 'today') => api.post('/pos/reset-sales', { scope }),
  getTransactions: (page = 1, limit = 20, startDate?: string, endDate?: string) =>
    api.get(`/pos/transactions?page=${page}&limit=${limit}${startDate ? `&start_date=${startDate}` : ''}${endDate ? `&end_date=${endDate}` : ''}`),
  getTransactionById: (id: number) => api.get(`/pos/transactions/${id}`),
  getTodaySoldItems: () => api.get('/pos/today-sold-items'),
};
