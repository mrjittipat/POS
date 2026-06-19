import api from './axios';

export interface Product {
  id: number;
  category_id: number | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  image_url: string | null;
  price: number;
  cost: number;
  unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const productsApi = {
  getAll: (page = 1, limit = 20, search?: string, categoryId?: number) =>
    api.get<{ success: boolean; data: Product[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      `/products?page=${page}&limit=${limit}${search ? `&search=${search}` : ''}${categoryId ? `&category_id=${categoryId}` : ''}`
    ),
  getById: (id: number) => api.get<{ success: true; data: Product }>(`/products/${id}`),
  getByBarcode: (code: string) => api.get<{ success: boolean; data: Product }>(`/products/barcode/${code}`),
  create: (data: FormData) => api.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: number, data: FormData) => api.put(`/products/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: number) => api.delete(`/products/${id}`),
};
