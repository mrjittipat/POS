import api from './axios';

export interface ProductImage {
  id: number;
  product_name: string;
  image_url: string;
  created_at: string;
  updated_at: string;
}

export const productImagesApi = {
  getAll: () => api.get<{ success: boolean; data: ProductImage[] }>('/product-images'),
  getByProductName: (productName: string) => api.get<{ success: boolean; data: ProductImage }>(`/product-images/${productName}`),
  save: (productName: string, imageUrl: string) => api.post('/product-images', { product_name: productName, image_url: imageUrl }),
  update: (id: number, productName: string, imageUrl: string) => api.put(`/product-images/${id}`, { product_name: productName, image_url: imageUrl }),
  delete: (id: number) => api.delete(`/product-images/${id}`),
  sync: () => api.post<{ success: boolean; message: string; updated: number }>('/product-images/sync'),
};
