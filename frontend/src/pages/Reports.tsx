import { useState, useEffect } from 'react';
import { reportsApi } from '../api/reports.api';
import { formatCurrency } from '../utils/format';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, TrendingUp, Package, DollarSign, Banknote, QrCode } from 'lucide-react';

// Helper: get local date string (YYYY-MM-DD) avoiding UTC issues
function getLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function Reports() {
  // Default แสดง "วันนี้" (เลือกวันที่อื่นได้จาก date picker)
  const [startDate, setStartDate] = useState(() => getLocalDateString(new Date()));
  const [endDate, setEndDate] = useState(() => getLocalDateString(new Date()));
  const [groupBy, setGroupBy] = useState<'day' | 'month' | 'year'>('day');
  const [salesData, setSalesData] = useState<{
    summary: { totalSales: number; totalOrders: number; totalItems: number; avgOrderValue: number; totalDiscount: number; totalVat: number };
    chart: { label: string; sales: number; orders: number }[];
    paymentBreakdown: { method: string; amount: number; count: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-load report on mount
  useEffect(() => {
    loadSalesReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSalesReport = async () => {
    // Prevent retry loop — stop if already loading
    if (loading) return;
    try {
      setLoading(true);
      const response = await reportsApi.getSales(startDate, endDate, groupBy);
      setSalesData((response.data as { success: boolean; data: typeof salesData }).data);
    } catch (error) {
      // Only log once, don't trigger state update loop
      console.error('Failed to load report (skipping retry):', error);
      setSalesData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่ม</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่สิ้นสุด</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">จัดกลุ่ม</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as 'day' | 'month' | 'year')} className="input">
              <option value="day">รายวัน</option>
              <option value="month">รายเดือน</option>
              <option value="year">รายปี</option>
            </select>
          </div>
          <button onClick={loadSalesReport} className="btn btn-primary flex items-center gap-2">
            <Calendar size={18} />
            ดูรายงาน
          </button>
        </div>
      </div>

      {salesData && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white">
                  <DollarSign size={24} />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">ยอดขายรวม</p>
                  <p className="text-2xl font-bold">{formatCurrency(salesData.summary.totalSales)}</p>
                </div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">จำนวนบิล</p>
                  <p className="text-2xl font-bold">{salesData.summary.totalOrders}</p>
                </div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center text-white">
                  <Package size={24} />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">สินค้าขายได้</p>
                  <p className="text-2xl font-bold">{salesData.summary.totalItems}</p>
                </div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white">
                  <DollarSign size={24} />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">ยอดขายเฉลี่ย/บิล</p>
                  <p className="text-2xl font-bold">{formatCurrency(salesData.summary.avgOrderValue)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment breakdown */}
          {salesData.paymentBreakdown && salesData.paymentBreakdown.length > 0 && (
            <div className="card p-6">
              <h3 className="font-bold text-lg mb-4">สรุปยอดขายแยกตามวิธีชำระเงิน</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {salesData.paymentBreakdown.map((p) => (
                  <div key={p.method} className={`p-4 rounded-xl ${p.method === 'cash' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${p.method === 'cash' ? 'bg-green-100' : 'bg-blue-100'}`}>
                        {p.method === 'cash' ? <Banknote size={20} className="text-green-600" /> : <QrCode size={20} className="text-blue-600" />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{p.method === 'cash' ? 'เงินสด' : 'QR PromptPay'}</p>
                        <p className="text-sm text-gray-500">{p.count} บิล</p>
                      </div>
                    </div>
                    <p className={`text-2xl font-bold ${p.method === 'cash' ? 'text-green-700' : 'text-blue-700'}`}>
                      {formatCurrency(p.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="card p-6">
            <h3 className="font-bold text-lg mb-4">กราฟยอดขาย</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData.chart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="sales" name="ยอดขาย (บาท)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}
    </div>
  );
}
