import { useState, useEffect } from 'react';
import { inventoryApi } from '../api/inventory.api';
import { formatNumber } from '../utils/format';
import { AlertTriangle, RefreshCw, X, ArrowUpDown, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDialog } from '../context/DialogContext';

interface InventoryItem {
  id: number;
  product_id: number;
  product_name: string;
  sku: string | null;
  quantity: number;
  min_stock: number;
  location: string | null;
}

const PAGE_SIZE = 10;

export default function Inventory() {
  const { toast } = useDialog();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [, setLoading] = useState(true);
  const [showAdjust, setShowAdjust] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [filter, setFilter] = useState<'all' | 'low'>('all');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    loadInventory();
  }, [filter, page]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryApi.getAll(page, PAGE_SIZE, filter === 'low');
      const resData = (response.data as { success: boolean; data: InventoryItem[]; pagination: { total: number } }).data;
      const resPagination = (response.data as { success: boolean; data: InventoryItem[]; pagination: { total: number } }).pagination;
      setItems(resData);
      setTotal(resPagination?.total ?? resData.length);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      await inventoryApi.adjust({
        product_id: selectedProduct.product_id,
        quantity: adjustQty,
        type: adjustType,
        reason: adjustReason,
      });
      setShowAdjust(false);
      setSelectedProduct(null);
      setAdjustQty(0);
      setAdjustReason('');
      loadInventory();
      toast({ message: 'ปรับสต๊อกสำเร็จ', type: 'success' });
    } catch (error) {
      toast({ message: 'เกิดข้อผิดพลาดในการปรับสต๊อก', type: 'error' });
    }
  };

  // Build pagination numbers
  const getPageNumbers = () => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => { setFilter('all'); setPage(1); }}
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => { setFilter('low'); setPage(1); }}
            className={`btn ${filter === 'low' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
          >
            <AlertTriangle size={16} />
            สินค้าใกล้หมด
          </button>
        </div>
        <span className="text-sm text-gray-500">ทั้งหมด {total} รายการ</span>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">สินค้า</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">SKU</th>
              <th className="text-right py-3 px-4 text-gray-600 font-medium">สต๊อก</th>
              <th className="text-right py-3 px-4 text-gray-600 font-medium">ขั้นต่ำ</th>
              <th className="text-center py-3 px-4 text-gray-600 font-medium">สถานะ</th>
              <th className="text-center py-3 px-4 text-gray-600 font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50" style={{ height: '52px' }}>
                <td className="py-3 px-4 font-medium">{item.product_name}</td>
                <td className="py-3 px-4 text-gray-500">{item.sku || '-'}</td>
                <td className="py-3 px-4 text-right font-bold">{formatNumber(item.quantity)}</td>
                <td className="py-3 px-4 text-right text-gray-500">{formatNumber(item.min_stock)}</td>
                <td className="py-3 px-4 text-center">
                  {item.quantity === 0 ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">หมด</span>
                  ) : item.quantity <= item.min_stock ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">ใกล้หมด</span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">ปกติ</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => {
                      setSelectedProduct(item);
                      setShowAdjust(true);
                    }}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                  >
                    <RefreshCw size={16} />
                  </button>
                </td>
              </tr>
            ))}

            {/* Fill remaining rows to always show PAGE_SIZE rows */}
            {Array.from({ length: Math.max(0, PAGE_SIZE - items.length) }).map((_, i) => (
              <tr key={`empty-${i}`} className="border-t border-gray-50" style={{ height: '52px' }}>
                <td className="py-3 px-4 text-gray-300">—</td>
                <td className="py-3 px-4"></td>
                <td className="py-3 px-4"></td>
                <td className="py-3 px-4"></td>
                <td className="py-3 px-4"></td>
                <td className="py-3 px-4"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4 border-t border-gray-100">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            {getPageNumbers().map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  p === page
                    ? 'bg-primary-600 text-white'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Adjust stock modal */}
      {showAdjust && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAdjust(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <ArrowUpDown size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">ปรับสต๊อก</h3>
                  <p className="text-sm text-gray-500">{selectedProduct.product_name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdjust(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdjust} className="p-6 space-y-5">
              <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                <Package size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">สต๊อกปัจจุบัน</p>
                  <p className="text-lg font-bold text-gray-900">{formatNumber(selectedProduct.quantity)} ชิ้น</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ประเภทการปรับ *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'in', label: 'รับเข้า', icon: '+', color: 'green' },
                    { value: 'out', label: 'ตัดออก', icon: '-', color: 'red' },
                    { value: 'adjustment', label: 'ปรับยอด', icon: '=', color: 'blue' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAdjustType(opt.value as 'in' | 'out' | 'adjustment')}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                        adjustType === opt.value
                          ? opt.color === 'green'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : opt.color === 'red'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-lg font-bold">{opt.icon}</span>
                      <br />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">จำนวน *</label>
                <input type="number" min="1" value={adjustQty} onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)} className="input text-lg font-semibold text-center focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" placeholder="0" required autoFocus />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">เหตุผล *</label>
                <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className="input focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" placeholder="เช่น รับสินค้าใหม่, ตรวจนับ..." required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdjust(false)} className="btn btn-secondary flex-1">ยกเลิก</button>
                <button type="submit" className="btn btn-primary flex-1">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
