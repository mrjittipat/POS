import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard.api';
import { formatCurrency, formatNumber } from '../utils/format';
import { TrendingUp, ShoppingCart, AlertTriangle, DollarSign, Banknote, QrCode, BarChart3 } from 'lucide-react';

// Global refresh callback — POS page calls this after successful checkout
declare global {
  interface Window {
    __refreshDashboard?: () => void;
  }
}

interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  totalProducts: number;
  lowStockCount: number;
  cashSales: number;
  cashCount: number;
  promptpaySales: number;
  promptpayCount: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
}

interface ChartItem {
  date: string;
  amount: number;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

export default function Dashboard() {
  const location = useLocation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, chartsRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getCharts(7),
      ]);
      const statsData = (statsRes.data as { success: boolean; data: DashboardStats }).data;
      setStats(statsData);
      const chartResponse = chartsRes.data as { success: boolean; data: { salesChart: ChartItem[]; topProducts: TopProduct[] } };
      setChartData(chartResponse.data.salesChart);
      setTopProducts(chartResponse.data.topProducts);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount and when refreshKey changes
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, refreshKey]);

  // Re-fetch when navigating to Dashboard route
  useEffect(() => {
    if (location.pathname === '/') {
      loadDashboard();
    }
  }, [location.pathname, loadDashboard]);

  // Register global refresh callback for POS page
  useEffect(() => {
    window.__refreshDashboard = () => setRefreshKey(k => k + 1);
    return () => { window.__refreshDashboard = undefined; };
  }, []);

  // Re-fetch when window regains focus (safety net)
  useEffect(() => {
    const handleFocus = () => loadDashboard();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-4">
        <p>{error}</p>
        <button onClick={loadDashboard} className="btn btn-primary">ลองใหม่</button>
      </div>
    );
  }

  const profitMargin = stats && stats.totalRevenue > 0
    ? ((stats.grossProfit / stats.totalRevenue) * 100).toFixed(1)
    : '0';

  // Backend returns DECIMAL columns as strings (mysql2) — coerce to numbers so arithmetic works
  const cashSales = Number(stats?.cashSales || 0);
  const promptpaySales = Number(stats?.promptpaySales || 0);
  const totalPayments = cashSales + promptpaySales;
  const cashPct = totalPayments > 0 ? (cashSales / totalPayments * 100) : 0;
  const promptpayPct = totalPayments > 0 ? (promptpaySales / totalPayments * 100) : 0;

  const maxChartAmount = Math.max(...chartData.map(d => d.amount), 1);

  return (
    <div className="space-y-6">
      {/* Main stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Sales */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">ยอดขายวันนี้</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(stats?.todaySales || 0)}</p>
              <p className="text-xs text-gray-400 mt-1">{stats?.todayOrders || 0} บิล</p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">รายได้รวมทั้งหมด</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{formatCurrency(stats?.totalRevenue || 0)}</p>
              <p className="text-xs text-gray-400 mt-1">ต้นทุน {formatCurrency(stats?.totalCost || 0)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white">
              <DollarSign size={24} />
            </div>
          </div>
        </div>

        {/* Profit */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">กำไรสุทธิ</p>
              <p className="text-2xl font-bold mt-1 text-purple-600">{formatCurrency(stats?.grossProfit || 0)}</p>
              <p className="text-xs text-gray-400 mt-1">มาร์จิ้น {profitMargin}%</p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center text-white">
              <DollarSign size={24} />
            </div>
          </div>
        </div>

        {/* Low Stock */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">สินค้าใกล้หมด</p>
              <p className="text-2xl font-bold mt-1 text-orange-600">{formatNumber(stats?.lowStockCount || 0)}</p>
              <p className="text-xs text-gray-400 mt-1">จาก {formatNumber(stats?.totalProducts || 0)} รายการ</p>
            </div>
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white">
              <AlertTriangle size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Payment breakdown + Sales chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment method breakdown */}
        <div className="card p-5">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <ShoppingCart size={20} className="text-gray-400" />
            ยอดขายวันนี้แยกตามวิธีชำระ
          </h3>

          {totalPayments > 0 ? (
            <>
              {/* Progress bar */}
              <div className="mb-4">
                <div className="h-8 rounded-full overflow-hidden flex bg-gray-100">
                  {cashPct > 0 && (
                    <div
                      className="h-full transition-all duration-500 flex items-center justify-center text-white text-xs font-bold"
                      style={{ width: `${cashPct}%`, backgroundColor: '#10b981', minWidth: cashPct > 5 ? '20px' : '0' }}
                    >
                      {cashPct > 10 ? `${cashPct.toFixed(0)}%` : ''}
                    </div>
                  )}
                  {promptpayPct > 0 && (
                    <div
                      className="h-full transition-all duration-500 flex items-center justify-center text-white text-xs font-bold"
                      style={{ width: `${promptpayPct}%`, backgroundColor: '#3b82f6', minWidth: promptpayPct > 5 ? '20px' : '0' }}
                    >
                      {promptpayPct > 10 ? `${promptpayPct.toFixed(0)}%` : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Breakdown list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <Banknote size={16} className="text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">เงินสด</p>
                      <p className="text-xs text-gray-400">{stats?.cashCount || 0} บิล ({cashPct.toFixed(0)}%)</p>
                    </div>
                  </div>
                  <p className="font-bold text-green-700">{formatCurrency(cashSales)}</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <QrCode size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">PromptPay</p>
                      <p className="text-xs text-gray-400">{stats?.promptpayCount || 0} บิล ({promptpayPct.toFixed(0)}%)</p>
                    </div>
                  </div>
                  <p className="font-bold text-blue-700">{formatCurrency(promptpaySales)}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <ShoppingCart size={40} className="mb-2 opacity-50" />
              <p className="text-sm">ยังไม่มีรายการขายวันนี้</p>
            </div>
          )}
        </div>

        {/* Sales chart - simple bar chart */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-gray-400" />
            ยอดขาย 7 วันล่าสุด
          </h3>
          <div className="h-64 flex items-end gap-2">
            {chartData.map((d, i) => {
              const heightPct = maxChartAmount > 0 ? (d.amount / maxChartAmount * 100) : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{d.amount > 0 ? formatCurrency(d.amount) : ''}</span>
                  <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '200px' }}>
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t-lg transition-all duration-500"
                      style={{ height: `${heightPct}%`, minHeight: d.amount > 0 ? '4px' : '0' }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 truncate w-full text-center">{d.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top products */}
      <div className="card p-6">
        <h3 className="font-bold text-lg mb-4">สินค้าขายดี 30 วันล่าสุด</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-gray-600 font-medium">สินค้า</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium">จำนวน</th>
                <th className="text-right py-3 px-4 text-gray-600 font-medium">ยอดขาย</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{product.name}</td>
                  <td className="py-3 px-4 text-right">{formatNumber(product.quantity)}</td>
                  <td className="py-3 px-4 text-right font-medium">{formatCurrency(product.revenue)}</td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-400">ยังไม่มีข้อมูล</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
