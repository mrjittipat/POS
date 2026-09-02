import { useState, useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Delete,
  CornerDownLeft,
  QrCode,
  Banknote,
  Store,
  CheckCircle2,
  Wallet,
  ShoppingBag,
} from 'lucide-react';
import { useAuthStore } from '../store';
import { useCartStore } from '../store/cart';
import { posApi } from '../api/pos.api';
import { formatCurrency } from '../utils/format';
import { addDrawerLog, getDrawerState } from '../utils/posStorage';
import { useNow } from '../hooks/useNow';
import { useDialog } from '../context/DialogContext';
import { useNotificationStore } from '../store/notifications';
import { getVatRate, getSettings, getReceiptFooter } from '../utils/appSettings';

const QUICK_AMOUNTS = [20, 50, 100, 500, 1000];
const KEYPAD = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];

interface ReceiptData {
  transactionCode: string;
  items: { product_name: string; quantity: number; price: number }[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  method: 'cash' | 'promptpay';
  received: number;
  changeAmount: number;
}

export default function Checkout() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { toast, showConfirm, showAlert } = useDialog();
  const now = useNow(1000);

  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);

  const [received, setReceived] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'promptpay'>('cash');
  const [processing, setProcessing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // VAT จากตั้งค่า (0 = ไม่มี VAT)
  const vatRate = getVatRate();
  const vatAmount = (subtotal * vatRate) / 100;
  const totalAmount = subtotal + vatAmount; // ยอดที่ต้องชำระ รวม VAT
  const settings = getSettings();

  const receivedNum = parseFloat(received) || 0;
  const changeAmount = Math.max(receivedNum - totalAmount, 0);
  const remainingAmount = Math.max(totalAmount - receivedNum, 0);
  const isSufficient = receivedNum >= totalAmount;

  // Cash drawer (เงินพัก) — available cash for giving change
  const drawerBalance = getDrawerState().balance;
  const drawerInsufficient = paymentMethod === 'cash' && receivedNum > drawerBalance;

  // QR (PromptPay) — bill + scan view
  const qrImage = typeof window !== 'undefined' ? localStorage.getItem('payment.promptpay_qr') : null;
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

  // result display per method
  const paidLabel = paymentMethod === 'cash' ? 'รับเงิน' : 'ชำระผ่าน QR';
  const showReceived = paymentMethod === 'cash' ? receivedNum : totalAmount;
  const showChange = paymentMethod === 'cash' ? changeAmount : 0;

  /* ----- keypad ----- */
  const appendDigit = (d: string) =>
    setReceived((prev) => {
      if (prev.includes('.')) {
        const [int, dec] = prev.split('.');
        if (dec.length >= 2) return prev;
        return `${int}.${dec}${d}`;
      }
      return prev === '0' ? d : prev + d;
    });
  const appendDecimal = () => setReceived((p) => (p.includes('.') ? p : `${p}.`));
  const backspace = () => setReceived((p) => (p.length <= 1 ? '0' : p.slice(0, -1).replace(/\.$/, '') || '0'));
  const quickAdd = (amt: number) => setReceived((p) => String((parseFloat(p) || 0) + amt));
  const exactAmount = () => setReceived(String(totalAmount));

  /* ----- navigation / cancel ----- */
  const goBack = () => navigate('/pos', { state: { fromCheckout: true } });

  const handleEsc = () => {
    if (showResult || processing) return;
    if (receivedNum === 0 && paymentMethod === 'cash') {
      goBack();
      return;
    }
    showConfirm({
      title: 'ยกเลิกการชำระเงิน',
      message: 'ต้องการยกเลิกการชำระเงินหรือไม่?',
      variant: 'danger',
      confirmText: 'ยืนยัน',
      onConfirm: goBack,
    });
  };

  /* ----- confirm ----- */
  const handleEnter = () => {
    if (processing) return;
    if (paymentMethod === 'cash') {
      if (receivedNum > drawerBalance) {
        showAlert({
          title: 'ยอดเงินพัก ไม่เพียงพอ',
          message: `เงินในลิ้นชักมีเพียง ${formatCurrency(drawerBalance)} บาท แต่รับเงินมา ${formatCurrency(receivedNum)} บาท เกินกว่าที่มีอยู่`,
          type: 'warning',
        });
        return;
      }
      if (!isSufficient) {
        showAlert({ title: 'จำนวนเงินไม่เพียงพอ', message: `ขาดอีก ${formatCurrency(remainingAmount)}`, type: 'warning' });
        return;
      }
    }
    setShowResult(true);
  };

  const finishSale = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      const netAmount = totalAmount;
      const receiptItems = items.map((i) => ({
        product_name: i.product_name,
        quantity: i.quantity,
        price: i.price,
      }));
      const res = await posApi.checkout({
        items,
        discount_amount: 0,
        discount_type: 'fixed',
        vat_rate: vatRate,
        payments: [{ method: paymentMethod, amount: netAmount }],
      });
      const txData = (res.data as { data?: { transactionCode?: string; transactionId?: number } }).data || {};

      // บันทึกประวัติเงินพัก: ทุกครั้งที่ชำระเงินสด เงินที่เพิ่มเข้ากล่อง = รับเงิน − เงินทอน
      if (paymentMethod === 'cash') {
        const netToDrawer = receivedNum - changeAmount; // เงินที่อยู่ในกล่องจริง
        addDrawerLog('in', Math.max(netToDrawer, 0), `ขายเงินสด · รับ ${formatCurrency(receivedNum)} · ทอน ${formatCurrency(changeAmount)}`, txData.transactionCode);
      }

      clearCart();
      window.__refreshDashboard?.();

      try {
        const res = await posApi.getTodaySoldItems();
        const payload = res.data as { success: boolean; data: { product_name: string; quantity: number; subtotal: number; created_at: string }[] };
        if (payload.success) useNotificationStore.getState().setItems(payload.data);
      } catch {
        /* ignore */
      }

      // แสดงใบเสร็จ
      setShowResult(false);
      setProcessing(false);
      setReceipt({
        transactionCode: txData.transactionCode || '',
        items: receiptItems,
        subtotal,
        vatRate,
        vatAmount,
        totalAmount: netAmount,
        method: paymentMethod,
        received: paymentMethod === 'cash' ? receivedNum : netAmount,
        changeAmount: paymentMethod === 'cash' ? changeAmount : 0,
      });
      return;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({ message: err.response?.data?.message || 'เกิดข้อผิดพลาด', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const closeReceipt = () => {
    setReceipt(null);
    navigate('/pos', { state: { fromCheckout: true } });
  };

  /* ----- QR โหมดขยายใหญ่ (คลิกที่ QR) + ลากย้ายได้ ----- */
  const [qrZoom, setQrZoom] = useState(false);
  const [qrDrag, setQrDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ px: number; py: number; bx: number; by: number } | null>(null);

  const startQrDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = { px: e.clientX, py: e.clientY, bx: qrDrag.x, by: qrDrag.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
  };
  const moveQrDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragStartRef.current;
    if (!s) return;
    setQrDrag({ x: s.bx + (e.clientX - s.px), y: s.by + (e.clientY - s.py) });
  };
  const endQrDrag = () => {
    dragStartRef.current = null;
    setDragging(false);
  };

  /* ----- keyboard ----- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (processing || showResult) return;
      if (e.key >= '0' && e.key <= '9') appendDigit(e.key);
      else if (e.key === '.' || e.key === ',') appendDecimal();
      else if (e.key === 'Backspace') backspace();
      else if (e.key === 'Enter') { e.preventDefault(); handleEnter(); }
      else if (e.key === 'Escape') handleEsc();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

  const keyBtn =
    'bg-white border border-gray-200 rounded-2xl shadow-sm text-gray-800 text-2xl font-bold active:scale-95 hover:bg-gray-50 active:bg-gray-100 transition-all';

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* ===== Top bar ===== */}
      <header className="h-16 shrink-0 bg-white border-b border-gray-200 px-5 flex items-center gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
            <Store size={20} className="text-primary-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 leading-none">หน้าคิดเงิน</p>
            <p className="text-xs text-gray-400 leading-tight mt-1">{items.length} รายการ · {dateStr} · {timeStr}</p>
          </div>
        </div>
        <button
          onClick={handleEsc}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors"
        >
          <ArrowLeft size={16} /> ยกเลิก (ESC)
        </button>
      </header>

      {/* ===== Body ===== */}
      <div className="flex-1 flex gap-6 p-6 min-h-0">
        {/* ----- LEFT ~70% ----- */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* ยอดรวม */}
          <div className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium">ยอดรวม (สินค้า)</span>
              <span className="text-xl font-bold text-gray-900 tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between mt-1.5 text-sm">
              <span className="text-gray-400">VAT {vatRate}%</span>
              <span className="text-gray-600 tabular-nums">{formatCurrency(vatAmount)}</span>
            </div>
            <div className="flex items-center justify-between mt-1.5 border-t border-dashed border-gray-200 pt-1.5 text-sm font-semibold">
              <span className="text-gray-500">รวมทั้งสิ้น</span>
              <span className="text-gray-900 tabular-nums">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* ยอดที่ต้องชำระ */}
          <div className="flex items-center justify-between bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl px-6 py-4 shadow-lg shadow-primary-600/20">
            <div>
              <p className="text-primary-100 font-medium text-sm">ยอดที่ต้องชำระ</p>
              <p className="text-primary-200 text-xs mt-0.5">จำนวนเงินที่ลูกค้าต้องจ่าย</p>
            </div>
            <p className="text-4xl md:text-5xl font-bold text-white tabular-nums tracking-tight">
              {formatCurrency(totalAmount)}
            </p>
          </div>

          {/* Cash: received display */}
          {paymentMethod === 'cash' ? (
            <>
              <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl shadow-sm border border-gray-100 relative p-6">
                <span className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                  <Banknote size={13} /> เงินสด
                </span>
                <p className="text-sm text-gray-400 mb-2">จำนวนเงินที่รับ</p>
                <p className="text-6xl md:text-7xl font-bold text-gray-900 tabular-nums tracking-tight">{formatCurrency(receivedNum)}</p>
                <div className={`mt-5 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium ${
                  isSufficient ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                }`}>
                  {isSufficient
                    ? <><Wallet size={15} /> เงินทอน {formatCurrency(changeAmount)}</>
                    : <>ขาดอีก {formatCurrency(remainingAmount)}</>}
                </div>
              </div>

              {/* เงินพักในลิ้นชัก — แยกออกจากเงินทอน ให้มีระยะห่างชัดเจน */}
              <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-3 mt-1">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <Wallet size={16} className="text-gray-400" /> เงินพักในลิ้นชัก
                </span>
                <div className="flex items-center gap-2">
                  {drawerInsufficient && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                      เงินพักไม่เพียงพอ
                    </span>
                  )}
                  <span className={`text-lg font-bold tabular-nums ${drawerInsufficient ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatCurrency(drawerBalance)}
                  </span>
                </div>
              </div>

              {/* ปุ่มจำนวนเงินด่วน */}
              <div className="grid grid-cols-5 gap-3">
                {QUICK_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => quickAdd(a)}
                    className="bg-white border border-gray-200 rounded-2xl py-4 text-xl font-bold text-gray-800 shadow-sm hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 active:scale-95 transition-all"
                  >
                    {a.toLocaleString('th-TH')}
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* QR (PromptPay): ฝั่งซ้ายแสดงรายการบิลเต็มจอ — QR อยู่ที่ Payment Control Panel ฝั่งขวา */
            <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto">
              {/* summary bar */}
              <div className="flex items-center justify-between bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100">
                <div>
                  <p className="text-gray-500 font-medium flex items-center gap-2">
                    <QrCode size={18} className="text-blue-600" /> บิล QR PromptPay
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{totalQty} ชิ้น · {items.length} รายการ</p>
                </div>
                <span className="text-2xl font-bold text-gray-900 tabular-nums">{formatCurrency(totalAmount)}</span>
              </div>

              {/* bill items */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div className="flex-1 max-h-[42vh] overflow-auto divide-y divide-gray-100">
                  {items.map((it, i) => (
                    <div key={it.product_id} className="flex items-center justify-between px-6 py-3 text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-gray-400 w-5 shrink-0">{i + 1}.</span>
                        <span className="truncate font-medium">{it.product_name}</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-gray-500 tabular-nums">×{it.quantity}</span>
                        <span className="font-semibold tabular-nums w-20 text-right">{formatCurrency(it.price * it.quantity)}</span>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="py-12 text-center text-gray-400 text-sm">ยังไม่มีสินค้าในบิล</div>
                  )}
                </div>
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>ยอดรวม (สินค้า)</span>
                    <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>VAT {vatRate}%</span>
                    <span className="tabular-nums">{formatCurrency(vatAmount)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-gray-900 pt-1.5 border-t border-dashed border-gray-200">
                    <span>รวมทั้งสิ้น</span>
                    <span className="tabular-nums">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ----- RIGHT ~30% ----- */}
        <div className="w-[340px] shrink-0 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Payment Control Panel</p>

          {paymentMethod === 'cash' ? (
            <>
              {/* รับพอดี + QR */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={exactAmount}
                  className="rounded-xl py-3 bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 active:scale-95 transition-all shadow-sm shadow-primary-600/20"
                >
                  รับพอดี
                </button>
                <button
                  onClick={() => setPaymentMethod('promptpay')}
                  className="rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                >
                  <QrCode size={16} /> QR CODE
                </button>
              </div>

              {/* Keypad + side actions */}
              <div className="flex gap-3 flex-1">
                <div className="flex-1 grid grid-cols-3 gap-2.5 content-stretch">
                  {[...KEYPAD, '0'].map((d) => (
                    <button key={d} onClick={() => appendDigit(d)} className={keyBtn}>
                      {d}
                    </button>
                  ))}
                  <button onClick={appendDecimal} className={`${keyBtn} text-xl`}>.</button>
                </div>
                <div className="flex flex-col gap-2.5 w-20">
                  <button onClick={backspace} className="flex-1 bg-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-700 hover:bg-gray-200 active:scale-95 transition-all">
                    <Delete size={22} />
                    <span className="text-[10px] mt-1 font-medium">BackSpace</span>
                  </button>
                  <button
                    onClick={handleEnter}
                    disabled={processing}
                    className="flex-[2] rounded-2xl bg-green-600 text-white flex flex-col items-center justify-center font-bold shadow-lg shadow-green-600/25 hover:bg-green-700 active:scale-95 disabled:bg-gray-300 disabled:shadow-none transition-all"
                  >
                    <CornerDownLeft size={22} />
                    <span className="text-[10px] mt-1">Enter</span>
                  </button>
                </div>
              </div>

              {/* ปุ่มเงินสด */}
              <button
                onClick={() => setPaymentMethod('cash')}
                className="mt-4 rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 active:scale-95 transition-all bg-green-600 text-white shadow-lg shadow-green-600/25"
              >
                <Banknote size={18} /> เงินสด
              </button>
            </>
          ) : (
            /* QR mode: QR แสดงใน Payment Control Panel ฝั่งขวา (ไม่ต้องเลื่อน) */
            <div className="flex-1 flex flex-col items-center gap-4 min-h-0 overflow-y-auto">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold shrink-0">
                <QrCode size={13} /> QR PROMPTPAY
              </div>

              {qrImage ? (
                <button
                  type="button"
                  onClick={() => setQrZoom(true)}
                  title="คลิกเพื่อดู QR ขนาดใหญ่"
                  className="relative group shrink-0"
                >
                  <img
                    src={qrImage}
                    alt="PromptPay QR"
                    draggable={false}
                    className="w-44 h-44 object-contain border-4 border-blue-100 rounded-2xl group-hover:opacity-90 transition-opacity"
                  />
                  <span className="absolute inset-x-0 bottom-0 py-1 text-[10px] font-semibold bg-black/50 text-white rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                    คลิกเพื่อขยาย / ลากย้าย
                  </span>
                </button>
              ) : (
                <div className="w-44 h-44 rounded-2xl border-2 border-dashed border-blue-300 flex flex-col items-center justify-center bg-blue-50/50 shrink-0">
                  <QrCode size={44} className="text-blue-300 mb-2" />
                  <p className="text-xs text-blue-400 text-center px-3">ยังไม่มี QR Code<br />ตั้งค่า → อัพโหลด QR</p>
                </div>
              )}

              <div className="text-center">
                <p className="text-xs text-gray-400">ยอดที่ต้องชำระ</p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatCurrency(totalAmount)}</p>
                <p className="text-xs text-gray-400 mt-1">ให้ลูกค้าสแกน QR เพื่อชำระเงิน</p>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-semibold shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                รอการชำระเงิน
              </div>

              <div className="flex-1" />

              <button
                onClick={handleEnter}
                disabled={processing}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-primary-700 text-white text-base font-bold shadow-lg shadow-blue-600/25 hover:from-blue-700 hover:to-primary-800 active:scale-95 disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none transition-all shrink-0"
              >
                ชำระเงินเสร็จสิ้น
              </button>

              <button
                onClick={() => setPaymentMethod('cash')}
                className="w-full rounded-xl py-3 font-bold flex items-center justify-center gap-2 active:scale-95 transition-all bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 shrink-0"
              >
                <Banknote size={18} /> สลับเป็นเงินสด
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===== QR big draggable overlay ===== */}
      {qrZoom && qrImage && (
        <div
          className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setQrZoom(false)}
        >
          {/* การ์ด QR ใหญ่ — ลากย้ายได้ */}
          <div
            role="dialog"
            onPointerDown={startQrDrag}
            onPointerMove={moveQrDrag}
            onPointerUp={endQrDrag}
            onClick={(e) => e.stopPropagation()}
            style={{
              transform: `translate(calc(-50% + ${qrDrag.x}px), calc(-50% + ${qrDrag.y}px))`,
              left: '50%',
              top: '50%',
              touchAction: 'none',
              boxShadow: '0 24px 80px rgba(0,0,0,.45)',
            }}
            className={`absolute z-10 bg-white rounded-3xl p-6 ${dragging ? 'cursor-grabbing' : 'cursor-grab'} select-none transition-shadow`}
          >
            <div className="text-center mb-3">
              <p className="text-lg font-bold text-gray-900">{settings.store_brand_name}</p>
              <p className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-0.5">
                <QrCode size={12} className="text-blue-600" /> PromptPay — ลากการ์ดไปมาได้
              </p>
            </div>

            <img
              src={qrImage}
              alt="PromptPay QR ใหญ่"
              draggable={false}
              className="w-[62vmin] h-[62vmin] max-w-[480px] max-h-[480px] object-contain"
            />

            <div className="text-center mt-4 pt-3 border-t border-dashed border-gray-200">
              <p className="text-xs text-gray-400">ยอดที่ต้องชำระ</p>
              <p className="text-3xl font-bold text-gray-900 tabular-nums tracking-tight">
                {formatCurrency(totalAmount)} <span className="text-sm font-medium text-gray-500">บาท</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">ให้ลูกค้าสแกน QR เพื่อชำระเงิน</p>
            </div>
          </div>

          {/* ปุ่มปิด */}
          <button
            onClick={() => setQrZoom(false)}
            className="absolute top-5 right-5 z-20 w-11 h-11 rounded-full bg-white/15 text-white hover:bg-white/25 backdrop-blur flex items-center justify-center text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* ===== Receipt modal ===== */}
      {receipt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={closeReceipt}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header ร้าน */}
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold">{settings.store_brand_name}</h3>
              {settings.store_address && <p className="text-xs text-gray-500 mt-0.5">{settings.store_address}</p>}
              {settings.store_phone && <p className="text-xs text-gray-500">โทร: {settings.store_phone}</p>}
              {settings.tax_id && <p className="text-xs text-gray-500">Tax ID: {settings.tax_id}</p>}
            </div>

            <div className="flex justify-between text-xs text-gray-500 border-b border-dashed border-gray-200 pb-2 mb-3">
              <span>{dateStr} {timeStr}</span>
              {receipt.transactionCode && <span className="tabular-nums">{receipt.transactionCode}</span>}
            </div>

            {/* รายการสินค้า */}
            <div className="space-y-1.5 mb-4">
              {receipt.items.map((it, i) => (
                <div key={i} className="flex justify-between text-sm gap-3">
                  <span className="flex-1 min-w-0 truncate">
                    {it.product_name} <span className="text-gray-400">×{it.quantity}</span>
                  </span>
                  <span className="tabular-nums shrink-0">{formatCurrency(it.price * it.quantity)}</span>
                </div>
              ))}
            </div>

            {/* รวม + VAT */}
            <div className="border-t border-dashed border-gray-200 pt-2 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>ยอดรวม (สินค้า)</span>
                <span className="tabular-nums">{formatCurrency(receipt.subtotal)}</span>
              </div>
              {receipt.vatRate > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>VAT {receipt.vatRate}%</span>
                  <span className="tabular-nums">{formatCurrency(receipt.vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1">
                <span>รวมทั้งสิ้น</span>
                <span className="tabular-nums">{formatCurrency(receipt.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>{receipt.method === 'cash' ? 'รับเงิน' : 'ชำระผ่าน QR'}</span>
                <span className="tabular-nums">{formatCurrency(receipt.received)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>เงินทอน</span>
                <span className="tabular-nums">{formatCurrency(receipt.changeAmount)}</span>
              </div>
            </div>

            {/* ข้อความท้ายใบเสร็จ */}
            <div className="text-center mt-4 pt-3 border-t border-dashed border-gray-200">
              <p className="text-xs text-gray-500">{getReceiptFooter()}</p>
            </div>

            <button
              onClick={closeReceipt}
              className="mt-5 w-full py-3 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 active:scale-[0.99] transition-all"
            >
              กลับหน้าขาย
            </button>
          </div>
        </div>
      )}

      {/* ===== Result modal ===== */}
      {showResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { if (!processing) setShowResult(false); }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-5">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 size={36} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">ชำระเงินสำเร็จ</h3>
            </div>

            <div className="space-y-3 border-t border-gray-100 pt-5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 flex items-center gap-1.5"><ShoppingBag size={15} /> ยอดรวม</span>
                <span className="font-semibold tabular-nums">{formatCurrency(totalAmount)} บาท</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 flex items-center gap-1.5">{paymentMethod === 'cash' ? <Banknote size={15} /> : <QrCode size={15} />} {paidLabel}</span>
                <span className="font-semibold tabular-nums">{formatCurrency(showReceived)} บาท</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 flex items-center gap-1.5"><Wallet size={15} /> เงินทอน</span>
                <span className="font-bold text-green-600 tabular-nums">{formatCurrency(showChange)} บาท</span>
              </div>
            </div>

            <button
              onClick={finishSale}
              disabled={processing}
              className="mt-6 w-full py-3.5 rounded-xl bg-green-600 text-white font-bold text-lg hover:bg-green-700 disabled:bg-gray-300 active:scale-[0.99] transition-all"
            >
              {processing ? 'กำลังบันทึก...' : 'เสร็จสิ้น'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
