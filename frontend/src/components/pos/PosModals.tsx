import { useState, useEffect, type ReactNode } from 'react';
import { X, Search, Package, RotateCcw, Trash2, Wallet, BarChart3, RefreshCw } from 'lucide-react';
import { productsApi, type Product } from '../../api/products.api';
import { inventoryApi } from '../../api/inventory.api';
import { formatCurrency, formatDateTime } from '../../utils/format';
import type { ParkedBill, DrawerState } from '../../utils/posStorage';

/* ---------- shared modal shell ---------- */
function ModalShell({ open, onClose, title, subtitle, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

/* ---------- check product ---------- */
export function CheckProductModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [stockMap, setStockMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const q = search.trim();
    if (!q) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const [prodRes, invRes] = await Promise.all([
        productsApi.getAll(1, 30, q),
        inventoryApi.getAll(1, 500),
      ]).catch(() => [{ data: { data: [] } }, null]);
      if (cancelled) return;
      setProducts((prodRes as { data: { data: Product[] } }).data.data);
      const inv = invRes?.data?.data ?? [];
      const map: Record<number, number> = {};
      for (const row of inv) {
        if (row && typeof row.product_id === 'number') map[row.product_id] = Number(row.quantity ?? 0);
      }
      setStockMap(map);
      setLoading(false);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search, open]);

  return (
    <ModalShell open={open} onClose={onClose} title="ตรวจสอบสินค้า" subtitle="ค้นหาด้วยชื่อหรือบาร์โค้ด">
      <div className="relative mb-4">
        <input
          type="text"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="พิมพ์ชื่อสินค้า หรือสแกนบาร์โค้ด..."
          className="input pl-10"
        />
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-600" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-gray-400 py-10">
          <Package size={40} className="mb-2 opacity-50" />
          <p className="text-sm">{search ? 'ไม่พบสินค้า' : 'พิมพ์เพื่อค้นหาสินค้า'}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
          {products.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{p.name}</p>
                <p className="text-xs text-gray-500">SKU: {p.sku ?? '-'}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">{formatCurrency(p.price)}</p>
                <p className="text-xs">
                  สต็อก: <span className={stockMap[p.id] !== undefined && stockMap[p.id] <= 0 ? 'text-red-500' : 'text-gray-600'}>
                    {stockMap[p.id] !== undefined ? stockMap[p.id] : '-'}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

/* ---------- parked bills (recall) ---------- */
export function ParkedBillModal({ open, onClose, bills, onRestore, onDelete }: {
  open: boolean;
  onClose: () => void;
  bills: ParkedBill[];
  onRestore: (bill: ParkedBill) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="พักบิล / เรียกคืน"
      subtitle={bills.length ? `${bills.length} บิลที่พักไว้` : undefined}
    >
      {bills.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-gray-400 py-10">
          <RotateCcw size={40} className="mb-2 opacity-50" />
          <p className="text-sm">ยังไม่มีบิลที่พักไว้</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bills.map((bill) => (
            <div key={bill.id} className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{bill.label}</p>
                <p className="text-xs text-gray-500">
                  {formatDateTime(bill.at)} · {bill.items.length} รายการ · <span className="font-semibold text-gray-700">{formatCurrency(bill.total)}</span>
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onRestore(bill)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100"
                >
                  <RotateCcw size={13} /> เรียกคืน
                </button>
                <button
                  onClick={() => onDelete(bill.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

/* ---------- money drawer (จัดการเงินพัก / ลด-เพิ่มเงิน) ---------- */
export function MoneyDrawerModal({ open, onClose, drawer, mode, canManage, onLog, onDeleteLog, onResetDrawer }: {
  open: boolean;
  onClose: () => void;
  drawer: DrawerState;
  mode: 'manage' | 'adjust';
  canManage: boolean;
  onLog: (type: 'in' | 'out', amount: number, note: string) => void;
  onDeleteLog: (id: string) => void;
  onResetDrawer: () => void;
}) {
  const [type, setType] = useState<'in' | 'out'>('in');
  const [amount, setAmount] = useState<number | ''>('');
  const [note, setNote] = useState('');

  const submit = () => {
    const amt = typeof amount === 'number' ? amount : parseFloat(amount as string) || 0;
    if (amt <= 0) return;
    if (type === 'out' && amt > drawer.balance) return;
    onLog(type, amt, note.trim() || (type === 'in' ? 'เพิ่มเงิน' : 'ลดเงิน'));
    setAmount('');
    setNote('');
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={mode === 'manage' ? 'จัดการเงินพัก' : 'ลด/เพิ่มเงิน'}
      subtitle="ยอดเงินในลิ้นชัก"
    >
      <div className="p-4 mb-4 bg-gray-50 rounded-xl text-center">
        <p className="text-xs text-gray-500 mb-1">เงินในลิ้นชัก</p>
        <p className="text-3xl font-bold text-gray-900">{formatCurrency(drawer.balance)}</p>
      </div>

      {/* โหมด ลด/เพิ่มเงิน: ฟอร์มปรับยอดด้วยตนเอง */}
      {mode === 'adjust' && (
        <div className="mb-4">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setType('in')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${type === 'in' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              เพิ่ม (+)
            </button>
            <button
              onClick={() => setType('out')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${type === 'out' ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              ลด (−)
            </button>
          </div>
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="จำนวนเงิน"
              className="input flex-1"
            />
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="หมายเหตุ"
              className="input flex-1"
            />
          </div>
          <button
            onClick={submit}
            disabled={!amount || (type === 'out' && (typeof amount === 'number' ? amount : parseFloat(amount as string) || 0) > drawer.balance)}
            className="w-full py-2.5 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            ตกลง
          </button>
        </div>
      )}

      {/* ประวัติ */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
          <Wallet size={13} /> ประวัติล่าสุด
        </p>
        {mode === 'manage' && canManage && (
          <p className="text-[10px] text-red-400">แตะ 🗑 เพื่อลบประวัติ (ไม่กระทบยอดเงิน)</p>
        )}
      </div>

      {drawer.logs.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">
          {mode === 'manage' ? 'ยังไม่มีรายการ — จะบันทึกอัตโนมัติเมื่อขายเงินสด' : 'ยังไม่มีรายการ'}
        </p>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
          {drawer.logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between px-3 py-2 text-sm gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate">{log.note}</p>
                <p className="text-xs text-gray-400">{formatDateTime(log.at)}</p>
              </div>
              <span className={`font-semibold tabular-nums shrink-0 ${log.type === 'in' ? 'text-green-600' : 'text-orange-600'}`}>
                {log.type === 'in' ? '+' : '−'}{formatCurrency(log.amount)}
              </span>
              {mode === 'manage' && canManage && (
                <button
                  onClick={() => onDeleteLog(log.id)}
                  title="ลบประวัตินี้"
                  className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* รีเซ็ตเงินพัก */}
      {canManage && (
        <button
          onClick={onResetDrawer}
          className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors"
        >
          <RefreshCw size={15} /> รีเซ็ตเงินพัก
        </button>
      )}
    </ModalShell>
  );
}

/* ---------- shift summary ---------- */
export function ShiftSummaryModal({ open, onClose, salesSummary, drawer, onReset }: {
  open: boolean;
  onClose: () => void;
  salesSummary: { totalSales: number; totalTransactions: number; cashSales: number; cashCount: number; promptpaySales: number; promptpayCount: number };
  drawer: DrawerState;
  onReset: () => void;
}) {
  return (
    <ModalShell open={open} onClose={onClose} title="Shift Summary" subtitle="สรุปยอดขายวันนี้">
      <div className="p-4 mb-4 bg-gray-50 rounded-xl">
        <p className="text-xs text-gray-500 mb-1">ยอดขายรวม</p>
        <p className="text-3xl font-bold text-gray-900">{formatCurrency(salesSummary.totalSales)}</p>
        <p className="text-xs text-gray-500 mt-1">{salesSummary.totalTransactions} รายการ</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">เงินสด</p>
          <p className="font-bold text-sm text-green-600">{formatCurrency(salesSummary.cashSales)}</p>
          <p className="text-xs text-gray-400">{salesSummary.cashCount} รายการ</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">PromptPay</p>
          <p className="font-bold text-sm text-blue-600">{formatCurrency(salesSummary.promptpaySales)}</p>
          <p className="text-xs text-gray-400">{salesSummary.promptpayCount} รายการ</p>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg mb-4">
        <p className="text-sm flex items-center gap-1.5 text-gray-600">
          <BarChart3 size={15} /> เงินในลิ้นชัก
        </p>
        <p className="font-bold">{formatCurrency(drawer.balance)}</p>
      </div>

      <button
        onClick={onReset}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100"
      >
        <RefreshCw size={15} /> รีเซ็ตยอดขาย
      </button>
    </ModalShell>
  );
}
