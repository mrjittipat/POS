import { useState, useCallback, useRef } from 'react';
import ProductGrid from '../components/pos/ProductGrid';
import CartSummary from '../components/pos/CartSummary';
import { Product } from '../api/products.api';
import { posApi, CartItem } from '../api/pos.api';
import { formatCurrency } from '../utils/format';
import { X, Smartphone, Banknote, ImagePlus, CheckCircle, TrendingUp, Banknote as CashIcon, QrCode, RotateCcw } from 'lucide-react';
import { useDialog } from '../context/DialogContext';
import { useNotificationStore } from '../store/notifications';

interface SalesSummary {
  totalSales: number;
  totalTransactions: number;
  cashSales: number;
  cashCount: number;
  promptpaySales: number;
  promptpayCount: number;
}

const initialSummary: SalesSummary = {
  totalSales: 0,
  totalTransactions: 0,
  cashSales: 0,
  cashCount: 0,
  promptpaySales: 0,
  promptpayCount: 0,
};

export default function POS() {
  const { toast } = useDialog();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('fixed');
  const [vatRate] = useState(7);
  const [showPayment, setShowPayment] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Sales summary state
  const [salesSummary, setSalesSummary] = useState<SalesSummary>(() => {
    const saved = localStorage.getItem('pos_sales_summary');
    return saved ? JSON.parse(saved) : initialSummary;
  });

  // Payment method selection
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'promptpay' | null>(null);

  // Cash payment state
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const cashInputRef = useRef<HTMLInputElement>(null);

  // PromptPay QR state
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);

  // Load QR image from localStorage on mount
  useState(() => {
    const saved = localStorage.getItem('payment.promptpay_qr');
    if (saved) setQrImageUrl(saved);
  });

  // Add product to cart
  const handleAddToCart = useCallback((product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.price - item.discount,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          barcode: product.barcode,
          price: product.price,
          quantity: 1,
          discount: 0,
          subtotal: product.price,
        },
      ];
    });
  }, []);

  // Update quantity
  const handleUpdateQuantity = (productId: number, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.product_id === productId
            ? {
                ...item,
                quantity: Math.max(1, item.quantity + delta),
                subtotal: Math.max(1, item.quantity + delta) * item.price - item.discount,
              }
            : item
        )
    );
  };

  // Remove item
  const handleRemoveItem = (productId: number) => {
    setCartItems((prev) => prev.filter((item) => item.product_id !== productId));
  };

  // Update item discount
  const handleUpdateDiscount = (productId: number, discount: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.product_id === productId
          ? { ...item, discount, subtotal: item.quantity * item.price - discount }
          : item
      )
    );
  };

  // Update bill discount
  const handleUpdateBillDiscount = (amount: number, type: 'percent' | 'fixed') => {
    setDiscountAmount(amount);
    setDiscountType(type);
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemDiscounts = cartItems.reduce((sum, item) => sum + item.discount, 0);
  const afterItemDiscounts = subtotal - itemDiscounts;
  let billDiscount = discountAmount;
  if (discountType === 'percent') {
    billDiscount = (afterItemDiscounts * discountAmount) / 100;
  }
  const afterBillDiscount = afterItemDiscounts - billDiscount;
  const vatAmount = (afterBillDiscount * vatRate) / 100;
  const netAmount = afterBillDiscount + vatAmount;

  // Cash calculation
  const cashReceivedNum = typeof cashReceived === 'number' ? cashReceived : parseFloat(cashReceived) || 0;
  const changeAmount = cashReceivedNum - netAmount;
  const isSufficient = cashReceivedNum >= netAmount;

  // Select payment method
  const handleSelectMethod = (method: 'cash' | 'promptpay') => {
    setSelectedMethod(method);
    setCashReceived('');
    if (method === 'cash') {
      setTimeout(() => cashInputRef.current?.focus(), 100);
    }
    // Reload QR image from localStorage
    const saved = localStorage.getItem('payment.promptpay_qr');
    if (saved) setQrImageUrl(saved);
  };

  // Update sales summary
  const updateSalesSummary = (method: 'cash' | 'promptpay', amount: number) => {
    setSalesSummary(prev => {
      const updated = {
        ...prev,
        totalSales: prev.totalSales + amount,
        totalTransactions: prev.totalTransactions + 1,
        ...(method === 'cash'
          ? { cashSales: prev.cashSales + amount, cashCount: prev.cashCount + 1 }
          : { promptpaySales: prev.promptpaySales + amount, promptpayCount: prev.promptpayCount + 1 }
        ),
      };
      localStorage.setItem('pos_sales_summary', JSON.stringify(updated));
      return updated;
    });
  };

  // Reset sales summary
  const handleResetSummary = () => {
    setSalesSummary(initialSummary);
    localStorage.removeItem('pos_sales_summary');
    toast({ message: 'รีเซ็ตยอดขายแล้ว', type: 'success' });
  };

  // Process checkout
  const handleConfirmPayment = async () => {
    if (!selectedMethod) return;
    if (selectedMethod === 'cash' && !isSufficient) return;

    setProcessing(true);
    try {
      await posApi.checkout({
        items: cartItems,
        discount_amount: discountAmount,
        discount_type: discountType,
        vat_rate: vatRate,
        payments: [{ method: selectedMethod, amount: netAmount }],
      });

      // Update sales summary
      updateSalesSummary(selectedMethod, netAmount);

      // Clear everything
      setCartItems([]);
      setDiscountAmount(0);
      setShowPayment(false);
      setSelectedMethod(null);
      setCashReceived('');
      toast({ message: `การขายสำเร็จ! ยอดสะสม: ${formatCurrency(salesSummary.totalSales + netAmount)}`, type: 'success' });

      // Trigger dashboard refresh
      window.__refreshDashboard?.();

      // Refresh notifications
      try {
        const res = await posApi.getTodaySoldItems();
        const payload = res.data as { success: boolean; data: { product_name: string; quantity: number; subtotal: number; created_at: string }[] };
        if (payload.success) useNotificationStore.getState().setItems(payload.data);
      } catch {
        // silently fail
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({ message: err.response?.data?.message || 'เกิดข้อผิดพลาด', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  // Close payment modal
  const handleClosePayment = () => {
    if (processing) return;
    setShowPayment(false);
    setSelectedMethod(null);
    setCashReceived('');
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* Product grid */}
      <div className="flex-1 card p-4">
        <ProductGrid onAddToCart={handleAddToCart} />
      </div>

      {/* Cart + Sales Summary */}
      <div className="w-96 space-y-4">
        <CartSummary
          items={cartItems}
          discountAmount={discountAmount}
          discountType={discountType}
          vatRate={vatRate}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onUpdateDiscount={handleUpdateDiscount}
          onUpdateBillDiscount={handleUpdateBillDiscount}
          onCheckout={() => { if (cartItems.length === 0) return; setShowPayment(true); setSelectedMethod(null); setCashReceived(''); }}
        />

        {/* Sales Summary Card */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp size={16} className="text-green-600" />
              </div>
              <h3 className="font-bold text-sm text-gray-700">ยอดขายวันนี้</h3>
            </div>
            {salesSummary.totalTransactions > 0 && (
              <button
                onClick={handleResetSummary}
                className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
                title="รีเซ็ตยอดขาย"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>

          {/* Total */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 mb-3 border border-green-100">
            <p className="text-xs text-green-600 mb-0.5">ยอดขายสะสม</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(salesSummary.totalSales)}</p>
            <p className="text-xs text-gray-500 mt-1">{salesSummary.totalTransactions} รายการ</p>
          </div>

          {/* Breakdown by payment method */}
          <div className="grid grid-cols-2 gap-2">
            {/* Cash */}
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <CashIcon size={12} className="text-green-600" />
                <span className="text-xs text-gray-500">เงินสด</span>
              </div>
              <p className="font-bold text-sm text-gray-800">{formatCurrency(salesSummary.cashSales)}</p>
              <p className="text-xs text-gray-400">{salesSummary.cashCount} รายการ</p>
            </div>

            {/* PromptPay */}
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <QrCode size={12} className="text-blue-600" />
                <span className="text-xs text-gray-500">PromptPay</span>
              </div>
              <p className="font-bold text-sm text-gray-800">{formatCurrency(salesSummary.promptpaySales)}</p>
              <p className="text-xs text-gray-400">{salesSummary.promptpayCount} รายการ</p>
            </div>
          </div>

          {/* Empty state */}
          {salesSummary.totalTransactions === 0 && (
            <p className="text-center text-xs text-gray-400 mt-2">ยังไม่มีรายการขาย</p>
          )}
        </div>
      </div>

      {/* Payment modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClosePayment}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  {selectedMethod === 'cash' ? (
                    <Banknote size={20} className="text-green-600" />
                  ) : selectedMethod === 'promptpay' ? (
                    <Smartphone size={20} className="text-blue-600" />
                  ) : (
                    <Banknote size={20} className="text-green-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {!selectedMethod ? 'เลือกช่องทางชำระเงิน' : selectedMethod === 'cash' ? 'ชำระด้วยเงินสด' : 'ชำระด้วย QR PromptPay'}
                  </h3>
                </div>
              </div>
              <button
                onClick={handleClosePayment}
                disabled={processing}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              {/* Total amount - always visible */}
              <div className="text-center mb-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">ยอดชำระ</p>
                <p className="text-3xl font-bold text-primary-600">
                  {formatCurrency(netAmount)}
                </p>
              </div>

              {/* Step 1: Select payment method */}
              {!selectedMethod && (
                <div className="space-y-3">
                  {/* Cash */}
                  <button
                    onClick={() => handleSelectMethod('cash')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <Banknote size={28} className="text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900 text-lg">เงินสด</p>
                      <p className="text-sm text-gray-500">รับเงินจากลูกค้า คำนวณเงินทอนอัตโนมัติ</p>
                    </div>
                  </button>

                  {/* QR PromptPay */}
                  <button
                    onClick={() => handleSelectMethod('promptpay')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <Smartphone size={28} className="text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900 text-lg">QR PromptPay</p>
                      <p className="text-sm text-gray-500">สแกน QR Code เพื่อชำระเงิน</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Step 2a: Cash payment */}
              {selectedMethod === 'cash' && (
                <div className="space-y-5">
                  {/* Back button */}
                  <button
                    onClick={() => { setSelectedMethod(null); setCashReceived(''); }}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
                  >
                    ← เลือกช่องทางอื่น
                  </button>

                  {/* Amount received input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">รับเงินจากลูกค้า *</label>
                    <div className="relative">
                      <input
                        ref={cashInputRef}
                        type="number"
                        min="0"
                        step="0.01"
                        value={cashReceived}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCashReceived(val === '' ? '' : parseFloat(val));
                        }}
                        className="input text-2xl font-bold text-center pr-12 focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                        placeholder="0.00"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">฿</span>
                    </div>
                  </div>

                  {/* Calculation result */}
                  {cashReceivedNum > 0 && (
                    <div className={`rounded-xl p-4 ${isSufficient ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                      {isSufficient ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle size={20} className="text-green-600" />
                            <span className="font-medium text-green-700">เงินทอน</span>
                          </div>
                          <span className="text-2xl font-bold text-green-700">
                            {formatCurrency(changeAmount)}
                          </span>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="font-medium text-orange-700">ยอดไม่เพียงพอ</p>
                          <p className="text-sm text-orange-600 mt-1">
                            ขาดอีก {formatCurrency(Math.abs(changeAmount))}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Exact payment hint */}
                  {cashReceivedNum > 0 && cashReceivedNum === netAmount && (
                    <div className="text-center text-green-600 font-medium text-sm">
                      ✓ จำนวนเงินพอดี
                    </div>
                  )}

                  {/* Confirm button */}
                  <button
                    onClick={handleConfirmPayment}
                    disabled={processing || !isSufficient || cashReceivedNum <= 0}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-lg transition-all ${
                      isSufficient && cashReceivedNum > 0 && !processing
                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/25'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {processing ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                        กำลังประมวลผล...
                      </span>
                    ) : 'ยืนยันการชำระเงิน'}
                  </button>
                </div>
              )}

              {/* Step 2b: QR PromptPay */}
              {selectedMethod === 'promptpay' && (
                <div className="space-y-5">
                  {/* Back button */}
                  <button
                    onClick={() => setSelectedMethod(null)}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
                  >
                    ← เลือกช่องทางอื่น
                  </button>

                  {/* QR Image display */}
                  <div className="flex flex-col items-center">
                    {qrImageUrl ? (
                      <div className="w-56 h-56 rounded-2xl border-2 border-gray-200 overflow-hidden bg-white shadow-inner">
                        <img src={qrImageUrl} alt="PromptPay QR" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-56 h-56 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50">
                        <ImagePlus size={40} className="text-gray-300 mb-2" />
                        <p className="text-sm text-gray-400">ไม่มี QR Code</p>
                        <p className="text-xs text-gray-400 mt-1">ไปที่ตั้งค่า → อัพโหลด QR</p>
                      </div>
                    )}
                    <p className="text-sm text-gray-500 mt-3">ให้ลูกค้าสแกน QR Code เพื่อชำระเงิน</p>
                  </div>

                  {/* Payment completed button */}
                  <button
                    onClick={handleConfirmPayment}
                    disabled={processing}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-lg transition-all ${
                      !processing
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25'
                        : 'bg-blue-400 text-white cursor-wait'
                    }`}
                  >
                    {processing ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                        กำลังประมวลผล...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle size={20} />
                        ชำระเงินแล้ว
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
