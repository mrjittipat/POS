import api from './axios';

export const categoriesApi = {
  getAll: () => api.get('/categories'),
  create: (data: { name: string; description?: string; is_active?: boolean }) => api.post('/categories', data),
  update: (id: number, data: { name?: string; description?: string; is_active?: boolean }) => api.put(`/categories/${id}`, data),
  delete: (id: number) => api.delete(`/categories/${id}`),
};
