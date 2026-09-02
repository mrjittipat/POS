import api from './axios';

export interface ArchivedProduct {
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
  deleted_at: string;
  deleted_by: number | null;
}

export const archivedApi = {
  getAll: (page = 1, limit = 20, search?: string) =>
    api.get<{ success: boolean; data: ArchivedProduct[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      `/products/archived/list?page=${page}&limit=${limit}${search ? `&search=${search}` : ''}`
    ),
  restore: (id: number) => api.post(`/products/archived/${id}/restore`),
  delete: (id: number) => api.delete(`/products/archived/${id}`),
};
