import { useState, useRef } from 'react';
import { X, Banknote, Smartphone, ImagePlus, CheckCircle } from 'lucide-react';
import type { CartItem } from '../../api/pos.api';
import { formatCurrency } from '../../utils/format';

interface PaymentModalProps {
  open: boolean;
  items: CartItem[];
  vatRate: number;
  onClose: () => void;
  onSubmit: (method: 'cash' | 'promptpay', netAmount: number) => Promise<void>;
}

export default function PaymentModal({ open, items, vatRate, onClose, onSubmit }: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'promptpay' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const cashInputRef = useRef<HTMLInputElement>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(() =>
    localStorage.getItem('payment.promptpay_qr')
  );

  if (!open) return null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const vatAmount = (subtotal * vatRate) / 100;
  const netAmount = subtotal + vatAmount;
  const cashReceivedNum = typeof cashReceived === 'number' ? cashReceived : parseFloat(cashReceived) || 0;
  const changeAmount = cashReceivedNum - netAmount;
  const isSufficient = cashReceivedNum >= netAmount;

  const handleSelectMethod = (method: 'cash' | 'promptpay') => {
    setSelectedMethod(method);
    setCashReceived('');
    if (method === 'cash') {
      setTimeout(() => cashInputRef.current?.focus(), 100);
    }
    setQrImageUrl(localStorage.getItem('payment.promptpay_qr'));
  };

  const backToMethods = () => {
    setSelectedMethod(null);
    setCashReceived('');
  };

  const submit = async () => {
    if (!selectedMethod) return;
    if (selectedMethod === 'cash' && !isSufficient) return;
    setProcessing(true);
    try {
      await onSubmit(selectedMethod, netAmount);
      setSelectedMethod(null);
      setCashReceived('');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {!selectedMethod ? 'บิลรายการรวม' : selectedMethod === 'cash' ? 'ชำระด้วยเงินสด' : 'ชำระด้วย QR PromptPay'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{items.length} รายการ</p>
          </div>
          <button
            onClick={onClose}
            disabled={processing}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-auto space-y-5">
          {/* Itemized bill */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 grid grid-cols-[2rem_1fr_3.5rem_5rem] gap-2 px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-200">
              <span>No.</span>
              <span>ชื่อสินค้า</span>
              <span className="text-right">จำนวน</span>
              <span className="text-right">ยอด</span>
            </div>
            <div className="max-h-56 overflow-auto divide-y divide-gray-100">
              {items.map((item, idx) => (
                <div key={item.product_id} className="grid grid-cols-[2rem_1fr_3.5rem_5rem] gap-2 px-3 py-2 text-sm">
                  <span className="text-gray-400">{idx + 1}</span>
                  <span className="truncate">{item.product_name}</span>
                  <span className="text-right tabular-nums">{item.quantity}</span>
                  <span className="text-right font-semibold tabular-nums">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-3 py-2.5 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm text-gray-600">ยอดรวมทั้งบิล</span>
              <span className="font-bold text-lg">{formatCurrency(subtotal)}</span>
            </div>
          </div>

          {/* Total to pay */}
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">ยอดชำระ (รวม VAT {vatRate}%)</p>
            <p className="text-3xl font-bold text-primary-600">{formatCurrency(netAmount)}</p>
          </div>

          {/* Step 1: payment method */}
          {!selectedMethod && (
            <div className="space-y-3">
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

          {/* Step 2a: cash */}
          {selectedMethod === 'cash' && (
            <div className="space-y-4">
              <button onClick={backToMethods} className="text-sm text-gray-500 hover:text-gray-700">
                ← เลือกช่องทางอื่น
              </button>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">รับเงินจากลูกค้า *</label>
                <div className="relative">
                  <input
                    ref={cashInputRef}
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="input text-2xl font-bold text-center pr-12 focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                    placeholder="0.00"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">฿</span>
                </div>
              </div>
              {cashReceivedNum > 0 && (
                <div className={`rounded-xl p-4 ${isSufficient ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                  {isSufficient ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={20} className="text-green-600" />
                        <span className="font-medium text-green-700">เงินทอน</span>
                      </div>
                      <span className="text-2xl font-bold text-green-700">{formatCurrency(changeAmount)}</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="font-medium text-orange-700">ยอดไม่เพียงพอ</p>
                      <p className="text-sm text-orange-600 mt-1">ขาดอีก {formatCurrency(Math.abs(changeAmount))}</p>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={submit}
                disabled={processing || !isSufficient || cashReceivedNum <= 0}
                className={`w-full py-3 px-4 rounded-xl font-bold text-lg transition-all ${
                  isSufficient && cashReceivedNum > 0 && !processing
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/25'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {processing ? 'กำลังประมวลผล...' : 'ยืนยันการชำระเงิน'}
              </button>
            </div>
          )}

          {/* Step 2b: promptpay */}
          {selectedMethod === 'promptpay' && (
            <div className="space-y-4">
              <button onClick={backToMethods} className="text-sm text-gray-500 hover:text-gray-700">
                ← เลือกช่องทางอื่น
              </button>
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
              <button
                onClick={submit}
                disabled={processing}
                className={`w-full py-3 px-4 rounded-xl font-bold text-lg transition-all ${
                  !processing ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25' : 'bg-blue-400 text-white cursor-wait'
                }`}
              >
                {processing ? (
                  'กำลังประมวลผล...'
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
  );
}
