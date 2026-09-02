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
  const [minStock, setMinStock] = useState(0);
  const [filter, setFilter] = useState<'all' | 'low'>('all');

  // เลือกจัดการสต๊อกหลายชิ้น
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkIds, setBulkIds] = useState<number[]>([]);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkType, setBulkType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [bulkQty, setBulkQty] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkMinStock, setBulkMinStock] = useState('');

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
      // บันทึกจำนวนขั้นต่ำด้วย (ถ้ามีการเปลี่ยน)
      await inventoryApi.updateMinStock(selectedProduct.product_id, minStock);
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

  /* ----- เลือกจัดการสต๊อกหลายชิ้น ----- */
  const startBulk = () => { setBulkIds([]); setBulkMode(true); };
  const cancelBulk = () => { setBulkIds([]); setBulkMode(false); setShowBulk(false); setBulkQty(''); setBulkReason(''); setBulkMinStock(''); };
  const toggleBulk = (id: number) => {
    setBulkIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleBulkAll = () => {
    setBulkIds((prev) => (prev.length === items.length ? [] : items.map((i) => i.product_id)));
  };
  const submitBulk = async () => {
    if (bulkIds.length === 0) return;
    const qty = parseInt(bulkQty) || 0;
    if (qty <= 0 || !bulkReason.trim()) {
      toast({ message: 'ระบุจำนวน (มากกว่า 0) และเหตุผลให้ครบ', type: 'warning' });
      return;
    }
    try {
      for (const id of bulkIds) {
        await inventoryApi.adjust({ product_id: id, quantity: qty, type: bulkType, reason: bulkReason.trim() });
        if (bulkMinStock !== '') {
          await inventoryApi.updateMinStock(id, Math.max(0, parseInt(bulkMinStock) || 0));
        }
      }
      toast({ message: 'จัดการสต๊อกสินค้าที่เลือกสำเร็จ', type: 'success' });
      setShowBulk(false);
      setBulkIds([]);
      setBulkMode(false);
      setBulkQty('');
      setBulkReason('');
      setBulkMinStock('');
      loadInventory();
    } catch {
      toast({ message: 'เกิดข้อผิดพลาดในการจัดการสต๊อก', type: 'error' });
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
        <div className="flex gap-2 flex-wrap items-center">
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
          {bulkMode ? (
            <>
              <span className="text-sm text-gray-600 flex items-center">เลือก {bulkIds.length} รายการ</span>
              <button onClick={cancelBulk} className="btn btn-secondary">ยกเลิก</button>
              <button
                onClick={() => setShowBulk(true)}
                disabled={bulkIds.length === 0}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <ArrowUpDown size={16} />
                จัดการสต๊อก ({bulkIds.length})
              </button>
            </>
          ) : (
            <button onClick={startBulk} className="btn btn-secondary flex items-center gap-2">
              <ArrowUpDown size={16} />
              เลือกจัดการสต๊อก
            </button>
          )}
        </div>
        <span className="text-sm text-gray-500">ทั้งหมด {total} รายการ</span>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {bulkMode && (
                <th className="text-left py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && bulkIds.length === items.length}
                    onChange={toggleBulkAll}
                    className="w-4 h-4 accent-primary-600"
                    title="เลือกทั้งหมด"
                  />
                </th>
              )}
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
                {bulkMode && (
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={bulkIds.includes(item.product_id)}
                      onChange={() => toggleBulk(item.product_id)}
                      className="w-4 h-4 accent-primary-600"
                    />
                  </td>
                )}
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
                      setMinStock(item.min_stock);
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
                <td colSpan={6 + (bulkMode ? 1 : 0)} className="py-3 px-4">&nbsp;</td>
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
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">จำนวนขั้นต่ำ (เกณฑ์แจ้งเตือนใกล้หมด)</label>
                <input type="number" min="0" value={minStock} onChange={(e) => setMinStock(Math.max(0, parseInt(e.target.value) || 0))} className="input text-center focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" placeholder="0" />
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

      {/* Bulk manage stock modal */}
      {showBulk && bulkIds.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={cancelBulk}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <ArrowUpDown size={20} className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">จัดการสต๊อกที่เลือก</h3>
                  <p className="text-sm text-gray-500">{bulkIds.length} รายการ</p>
                </div>
              </div>
              <button
                onClick={cancelBulk}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* รายการที่เลือก */}
              <div className="bg-gray-50 rounded-xl p-3 max-h-28 overflow-y-auto text-sm text-gray-600 space-y-0.5">
                {items.filter((i) => bulkIds.includes(i.product_id)).map((i) => (
                  <p key={i.product_id} className="truncate">{i.product_name}</p>
                ))}
              </div>

              {/* ประเภทการปรับ */}
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
                      onClick={() => setBulkType(opt.value as 'in' | 'out' | 'adjustment')}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                        bulkType === opt.value
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
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">จำนวน (ใช้กับทุกชิ้นที่เลือก) *</label>
                <input
                  type="number"
                  min="1"
                  value={bulkQty}
                  onChange={(e) => setBulkQty(e.target.value)}
                  className="input text-center focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="เช่น 10"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ตั้งจำนวนขั้นต่ำใหม่ (ไม่บังคับ)</label>
                <input
                  type="number"
                  min="0"
                  value={bulkMinStock}
                  onChange={(e) => setBulkMinStock(e.target.value)}
                  className="input text-center focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="เว้นว่าง = ไม่เปลี่ยน"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">เหตุผล *</label>
                <input
                  type="text"
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  className="input focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="เช่น รับสินค้าใหม่, ตรวจนับ..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cancelBulk} className="btn btn-secondary flex-1">ยกเลิก</button>
                <button type="button" onClick={submitBulk} className="btn btn-primary flex-1">บันทึก</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
