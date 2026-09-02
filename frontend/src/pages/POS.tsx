import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Store, ListOrdered, Package } from 'lucide-react';
import ProductGrid from '../components/pos/ProductGrid';
import BillTable from '../components/pos/BillTable';
import PosSidebar from '../components/pos/PosSidebar';
import {
  CheckProductModal,
  ParkedBillModal,
  MoneyDrawerModal,
  ShiftSummaryModal,
} from '../components/pos/PosModals';
import { formatCurrency } from '../utils/format';
import { useNow } from '../hooks/useNow';
import { useCartStore } from '../store/cart';
import { useAuthStore } from '../store';
import {
  getParkedBills,
  saveParkedBill,
  removeParkedBill,
  getDrawerState,
  addDrawerLog,
  removeDrawerLog,
  deductDrawerMoney,
  removeDrawerLogsByRef,
  resetDrawerState,
  type ParkedBill,
  type DrawerState,
} from '../utils/posStorage';
import { useDialog } from '../context/DialogContext';
import { dashboardApi } from '../api/dashboard.api';
import { posApi } from '../api/pos.api';
import { inventoryApi } from '../api/inventory.api';
import { productsApi } from '../api/products.api';
import type { Product } from '../api/products.api';

interface SalesSummary {
  totalSales: number;
  totalTransactions: number;
  cashSales: number;
  cashCount: number;
  promptpaySales: number;
  promptpayCount: number;
}

const initialSummary: SalesSummary = {
  totalSales: 0, totalTransactions: 0, cashSales: 0, cashCount: 0, promptpaySales: 0, promptpayCount: 0,
};

export default function POS() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast, showConfirm } = useDialog();
  const now = useNow();
  // admin/manager จัดการเงิน (ลบประวัติ + ลด/เพิ่ม) ได้, พนักงานขายดูได้อย่างเดียว
  const canManageMoney = useAuthStore((s) => (s.user?.role === 'admin' || s.user?.role === 'manager'));

  const cartItems = useCartStore((s) => s.items);
  const addToCart = useCartStore((s) => s.addToCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'bill'>('bill');
  // สต็อกสินค้า (product_id → จำนวนคงเหลือ)
  const [stockMap, setStockMap] = useState<Record<number, number>>({});
  // Use ref to store the latest stock map for immediate access (avoid React state delay)
  const stockMapRef = useRef<Record<number, number>>({});

  // modals
  const [showCheckProduct, setShowCheckProduct] = useState(false);
  const [showRecall, setShowRecall] = useState(false);
  const [showMoney, setShowMoney] = useState(false);
  const [moneyMode, setMoneyMode] = useState<'manage' | 'adjust'>('manage');
  const [showShift, setShowShift] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // persisted data
  const [salesSummary, setSalesSummary] = useState<SalesSummary>(initialSummary);

  // Handle barcode scan from global handler
  useEffect(() => {
    const state = location.state as { scannedBarcode?: string } | undefined;
    if (state?.scannedBarcode) {
      handleBarcodeScan(state.scannedBarcode);
      // Clear the state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleBarcodeScan = async (barcode: string) => {
    try {
      const res = await productsApi.getByBarcode(barcode);
      const product = (res.data as { success: boolean; data: Product }).data;

      if (!product.is_active) {
        toast({ message: `"${product.name}" ไม่ได้เปิดใช้งาน`, type: 'warning' });
        return;
      }

      // Check stock before adding - use ref for immediate access
      const available = stockMapRef.current[product.id];
      const inCart = cartItems.find((i) => i.product_id === product.id)?.quantity || 0;

      console.log(`[Barcode] Product: ${product.name} (ID: ${product.id})`);
      console.log(`[Barcode] Available stock: ${available}, In cart: ${inCart}`);
      console.log(`[Barcode] Current stockMapRef:`, stockMapRef.current);

      if (available === undefined || available <= 0) {
        toast({ message: `"${product.name}" สินค้าหมด ไม่มีสต็อก`, type: 'warning' });
        return;
      }

      if (inCart + 1 > available) {
        toast({ message: `"${product.name}" สต็อกไม่เพียงพอ (คงเหลือ ${available} ชิ้น)`, type: 'warning' });
        return;
      }

      handleAddToCart(product);
      setActiveTab('bill');
    } catch (error: any) {
      const errMsg = error.response?.data?.message || 'ไม่พบสินค้า';
      toast({ message: errMsg, type: 'error' });
    }
  };

  // ดึงยอดขายวันนี้จริงจากฐานข้อมูล (รีตามวันอัตโนมัติ)
  const loadTodayStats = async () => {
    try {
      const res = await dashboardApi.getStats();
      const data = (res.data as { success: boolean; data: {
        todaySales: number; todayOrders: number;
        cashSales: number; cashCount: number;
        promptpaySales: number; promptpayCount: number;
      } }).data;
      setSalesSummary({
        totalSales: data.todaySales,
        totalTransactions: data.todayOrders,
        cashSales: data.cashSales,
        cashCount: data.cashCount,
        promptpaySales: data.promptpaySales,
        promptpayCount: data.promptpayCount,
      });
    } catch {
      // ignore
    }
  };

  // Track if we're loading stock to prevent race conditions
  const loadingStockRef = useRef(false);

  useEffect(() => {
    loadTodayStats();
    loadStock();
  }, []);

  // Reload stock when navigating back from checkout
  useEffect(() => {
    // Check if we just came back from checkout (location.state will be set by navigate)
    if (location.state && 'fromCheckout' in location.state) {
      loadStock();
      // Clear the state so it doesn't trigger again
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // โหลดสต็อกทั้งหมดมาเช็คจำนวนตอนเพิ่มสินค้า
  const loadStock = async () => {
    if (loadingStockRef.current) {
      console.log('[POS] Stock load already in progress, skipping');
      return;
    }

    loadingStockRef.current = true;
    try {
      const res = await inventoryApi.getAll(1, 1000);
      const rows = (res.data as { success: boolean; data: { product_id: number; quantity: number }[] }).data;
      const map: Record<number, number> = {};
      rows.forEach((r) => {
        if (r && typeof r.product_id === 'number') map[r.product_id] = Number(r.quantity ?? 0);
      });
      console.log('[POS] Loaded stock map:', map);
      // Update both ref (immediate) and state (for UI)
      stockMapRef.current = map;
      setStockMap(map);
    } catch (err) {
      console.error('[POS] Failed to load stock:', err);
    } finally {
      loadingStockRef.current = false;
    }
  };

  // เพิ่มสินค้าเข้าบิลพร้อมเช็คสต็อก
  const handleAddToCart = (product: Product) => {
    const available = stockMapRef.current[product.id];
    // If stock info is missing (undefined), treat as out of stock
    if (available === undefined || available <= 0) {
      toast({
        message: `"${product.name}" สินค้าหมด ไม่มีสต็อก`,
        type: 'warning',
      });
      return;
    }
    const inCart = cartItems.find((i) => i.product_id === product.id)?.quantity || 0;
    if (inCart + 1 > available) {
      toast({
        message: `"${product.name}" สต็อกไม่เพียงพอ (คงเหลือ ${available} ชิ้น)`,
        type: 'warning',
      });
      return;
    }
    addToCart(product);
  };

  // ปรับจำนวนในบิลพร้อมเช็คสต็อก
  const handleUpdateQuantity = (productId: number, delta: number) => {
    if (delta > 0) {
      const available = stockMapRef.current[productId] ?? Infinity;
      const inCart = cartItems.find((i) => i.product_id === productId)?.quantity || 0;
      if (inCart + delta > available) {
        toast({ message: `สต็อกสินค้าไม่เพียงพอ (คงเหลือ ${available} ชิ้น)`, type: 'warning' });
        return;
      }
    }
    updateQuantity(productId, delta);
  };
  const [parkedBills, setParkedBills] = useState<ParkedBill[]>(() => getParkedBills());
  const [drawer, setDrawer] = useState<DrawerState>(() => getDrawerState());

  // totals (no VAT/discount shown on the register screen)
  const totalItems = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const clearCartAndGoProducts = () => {
    clearCart();
    setActiveTab('products');
  };

  const handleCancelSale = () => {
    if (cartItems.length === 0) return;
    showConfirm({
      title: 'ยกเลิกการขาย',
      message: 'แน่ใจว่าต้องการยกเลิกรายการทั้งหมดในบิลนี้?',
      variant: 'danger',
      confirmText: 'ยกเลิกการขาย',
      onConfirm: () => {
        clearCartAndGoProducts();
        toast({ message: 'ยกเลิกการขายแล้ว', type: 'info' });
      },
    });
  };

  /* ----- park / recall ----- */
  const handleParkBill = () => {
    if (cartItems.length === 0) return;
    const bill: ParkedBill = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: `บิล ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} · ${totalItems} ชิ้น`,
      items: cartItems,
      total: subtotal,
      at: new Date().toISOString(),
    };
    saveParkedBill(bill);
    setParkedBills(getParkedBills());
    clearCartAndGoProducts();
    toast({ message: 'พักบิลแล้ว', type: 'success' });
  };

  const handleRestoreBill = (bill: ParkedBill) => {
    useCartStore.getState().setItems(bill.items);
    removeParkedBill(bill.id);
    setParkedBills(getParkedBills());
    setShowRecall(false);
    toast({ message: 'เรียกคืนบิลแล้ว', type: 'success' });
  };

  const handleDeleteParked = (id: string) => {
    removeParkedBill(id);
    setParkedBills(getParkedBills());
  };

  /* ----- money drawer ----- */
  const handleDrawerLog = (type: 'in' | 'out', amount: number, note: string) => {
    setDrawer(addDrawerLog(type, amount, note));
  };

  const handleRemoveDrawerLog = (id: string) => {
    setDrawer(removeDrawerLog(id));
  };

  const handleResetDrawer = () => {
    showConfirm({
      title: 'รีเซ็ตเงินพัก',
      message: 'รีเซ็ตยอดเงินในลิ้นชักกลับเป็น 0 และล้างประวัติเงินพักทั้งหมด?',
      variant: 'danger',
      confirmText: 'รีเซ็ต',
      onConfirm: () => {
        setDrawer(resetDrawerState());
        toast({ message: 'รีเซ็ตเงินพักแล้ว', type: 'success' });
      },
    });
  };

  const handleResetShift = () => {
    showConfirm({
      title: 'รีเซ็ตยอดขาย',
      message: 'รีเซ็ตยอดขายสะสมของวันนี้?',
      variant: 'danger',
      confirmText: 'รีเซ็ต',
      onConfirm: async () => {
        try {
          const res = await posApi.resetSales('today');
          const data = (res.data as { data?: { cashReset?: number; transactionCodes?: string[] } }).data || {};
          // ลบเงินพักเฉพาะรายการจากบิลที่ถูกรีเซ็ต (ตามเลข transaction)
          const { state, removedCount, removedAmount } = removeDrawerLogsByRef(data.transactionCodes || []);
          let drawerMsg = '';
          if (removedCount > 0) {
            setDrawer(state);
            drawerMsg = ` (ลบเงินพัก ${removedCount} รายการ = ${formatCurrency(removedAmount)} บาท)`;
          } else if (data.cashReset && data.cashReset > 0) {
            // กรณี log เก่าไม่มีเลข transaction — หักรวมตามยอดเงินสด
            setDrawer(deductDrawerMoney(data.cashReset, 'หักออกตามยอดขายที่รีเซ็ต'));
            drawerMsg = ` (หักเงินพัก ${formatCurrency(data.cashReset)} บาท)`;
          }
          await loadTodayStats();
          toast({ message: `รีเซ็ตยอดขายวันนี้แล้ว${drawerMsg}`, type: 'success' });
        } catch {
          toast({ message: 'เกิดข้อผิดพลาดในการรีเซ็ตยอดขาย', type: 'error' });
        }
      },
    });
  };

  /* ----- keyboard ----- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
      if (e.key === 'Enter' && !inInput) {
        if (cartItems.length > 0) navigate('/pos/checkout');
      } else if (e.key === 'Escape') {
        if (showMobileSidebar) setShowMobileSidebar(false);
        else if (activeTab === 'bill') setActiveTab('products');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cartItems.length, showMobileSidebar, activeTab, navigate]);

  const openCheckout = () => {
    if (cartItems.length === 0) return;
    setShowMobileSidebar(false);
    navigate('/pos/checkout');
  };

  const dateStr = `${now.getDate().toString().padStart(2, '0')} / ${(now.getMonth() + 1).toString().padStart(2, '0')} / ${now.getFullYear()}`;
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] min-h-[560px]">
      {/* ===== Header toolbar ===== */}
      <div className="flex items-center gap-4 pb-3 border-b-2 border-gray-300 mb-3">
        <div className="flex items-center gap-2">
          <Store size={22} className="text-gray-700" />
          <span className="font-bold text-xl tracking-wide">Store</span>
        </div>
        <span className="text-sm text-gray-500 tabular-nums">{dateStr}</span>
        <span className="hidden md:inline-flex px-2.5 py-1 rounded-full border border-green-300 bg-green-50 text-green-700 text-xs font-semibold">
          ยอดขาย {formatCurrency(salesSummary.totalSales)}
        </span>
        <span className="ml-auto text-sm text-gray-500 tabular-nums">Time {timeStr}</span>
      </div>

      {/* ===== Main split ===== */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Left: 75% */}
        <div className="flex-1 flex flex-col border border-gray-300 rounded-lg bg-white min-w-0">
          {/* tabs */}
          <div className="flex items-center border-b border-gray-300">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-r border-gray-200 ${
                activeTab === 'products' ? 'bg-sky-50 text-sky-700 border-b-2 border-b-sky-500' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Package size={16} /> สินค้า
            </button>
            <button
              onClick={() => setActiveTab('bill')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-r border-gray-200 ${
                activeTab === 'bill' ? 'bg-sky-50 text-sky-700 border-b-2 border-b-sky-500' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ListOrdered size={16} /> บิล {cartItems.length > 0 && `(${cartItems.length})`}
            </button>
          </div>

          {/* content */}
          <div className="flex-1 flex flex-col min-h-0">
            {activeTab === 'products' ? (
              <div className="flex-1 p-3 overflow-auto">
                <ProductGrid onAddToCart={handleAddToCart} search={search} onSearchChange={setSearch} stockMap={stockMap} />
              </div>
            ) : (
              <BillTable items={cartItems} onUpdateQuantity={handleUpdateQuantity} onRemoveItem={removeItem} />
            )}

            {/* summary bar */}
            <div className="flex items-center justify-between border-t border-gray-300 bg-gray-50 px-4 py-3 text-sm">
              <span className="text-gray-600">รวม <span className="font-semibold">{cartItems.length}</span> รายการ</span>
              <span className="text-gray-600"><span className="font-semibold">{totalItems}</span> ชิ้น</span>
              <button onClick={openCheckout} disabled={cartItems.length === 0} className="flex items-baseline gap-2 disabled:cursor-not-allowed">
                <span className="text-gray-600">ยอดรวม</span>
                <span className="text-xl font-bold text-gray-900 tabular-nums">{formatCurrency(subtotal)} บาท</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: 25% sidebar */}
        <aside className="hidden lg:flex w-[300px] shrink-0 flex-col">
          <PosSidebar
            hasItems={cartItems.length > 0}
            onCancelSale={handleCancelSale}
            onCheckProduct={() => setShowCheckProduct(true)}
            onParkBill={handleParkBill}
            onRecall={() => setShowRecall(true)}
            onManageMoney={() => { setMoneyMode("manage"); setShowMoney(true); }}
            onAdjustMoney={() => { setMoneyMode("adjust"); setShowMoney(true); }}
            onShiftSummary={() => setShowShift(true)}
            canAdjust={canManageMoney}
            onEnter={openCheckout}
          />
        </aside>
      </div>

      {/* ===== Mobile bottom bar ===== */}
      <div className="lg:hidden mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={openCheckout}
          disabled={cartItems.length === 0}
          className="py-3 rounded-lg bg-sky-500 text-white font-bold disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Enter / ชำระเงิน
        </button>
        <button
          onClick={() => setShowMobileSidebar((v) => !v)}
          className="py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold"
        >
          ปุ่มฟังก์ชัน
        </button>
      </div>

      {showMobileSidebar && (
        <div className="lg:hidden border border-gray-300 rounded-lg bg-white p-2">
          <PosSidebar
            hasItems={cartItems.length > 0}
            onCancelSale={handleCancelSale}
            onCheckProduct={() => setShowCheckProduct(true)}
            onParkBill={handleParkBill}
            onRecall={() => setShowRecall(true)}
            onManageMoney={() => { setMoneyMode("manage"); setShowMoney(true); }}
            onAdjustMoney={() => { setMoneyMode("adjust"); setShowMoney(true); }}
            onShiftSummary={() => setShowShift(true)}
            canAdjust={canManageMoney}
            onEnter={openCheckout}
          />
        </div>
      )}

      {/* ===== Modals ===== */}
      <CheckProductModal open={showCheckProduct} onClose={() => setShowCheckProduct(false)} />
      <ParkedBillModal
        open={showRecall}
        onClose={() => setShowRecall(false)}
        bills={parkedBills}
        onRestore={handleRestoreBill}
        onDelete={handleDeleteParked}
      />
      <MoneyDrawerModal
        open={showMoney}
        onClose={() => setShowMoney(false)}
        drawer={drawer}
        mode={moneyMode}
        canManage={canManageMoney}
        onLog={handleDrawerLog}
        onDeleteLog={handleRemoveDrawerLog}
        onResetDrawer={handleResetDrawer}
      />
      <ShiftSummaryModal open={showShift} onClose={() => setShowShift(false)} salesSummary={salesSummary} drawer={drawer} onReset={handleResetShift} />
    </div>
  );
}
