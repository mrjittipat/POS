import api from './axios';

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getCharts: (days = 7) => api.get(`/dashboard/charts?days=${days}`),
  getSalesSummary: (days = 30) => api.get(`/dashboard/sales-summary?days=${days}`),
};
