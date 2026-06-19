import api from './axios';

export const reportsApi = {
  getSales: (startDate: string, endDate: string, groupBy: string = 'day') =>
    api.get(`/reports/sales?start_date=${startDate}&end_date=${endDate}&group_by=${groupBy}`),
  getProducts: (startDate: string, endDate: string) =>
    api.get(`/reports/products?start_date=${startDate}&end_date=${endDate}`),
  getProfitLoss: (startDate: string, endDate: string) =>
    api.get(`/reports/profit-loss?start_date=${startDate}&end_date=${endDate}`),
  getInventory: () => api.get('/reports/inventory'),
};
