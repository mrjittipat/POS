import api from './axios';

export const inventoryApi = {
  getAll: (page = 1, limit = 20, lowStock?: boolean) =>
    api.get(`/inventory?page=${page}&limit=${limit}${lowStock ? '&low_stock=true' : ''}`),
  getLowStock: () => api.get('/inventory/low-stock'),
  adjust: (data: { product_id: number; quantity: number; type: 'in' | 'out' | 'adjustment'; reason: string }) =>
    api.post('/inventory/adjust', data),
  updateMinStock: (productId: number, minStock: number) =>
    api.put('/inventory/min-stock', { product_id: productId, min_stock: minStock }),
  getLogs: (page = 1, limit = 50, productId?: number) =>
    api.get(`/inventory/logs?page=${page}&limit=${limit}${productId ? `&product_id=${productId}` : ''}`),
};
