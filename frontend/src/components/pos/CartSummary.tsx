import { Trash2, Minus } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

export interface CartItemDisplay {
  product_id: number;
  product_name: string;
  barcode: string | null;
  price: number;
  quantity: number;
  discount: number;
  subtotal: number;
}

interface CartSummaryProps {
  items: CartItemDisplay[];
  discountAmount: number;
  discountType: 'percent' | 'fixed';
  vatRate: number;
  onUpdateQuantity: (productId: number, delta: number) => void;
  onRemoveItem: (productId: number) => void;
  onUpdateDiscount: (productId: number, discount: number) => void;
  onUpdateBillDiscount: (amount: number, type: 'percent' | 'fixed') => void;
  onCheckout: () => void;
}

export default function CartSummary({
  items,
  discountAmount,
  discountType,
  vatRate,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateDiscount: _onUpdateDiscount,
  onUpdateBillDiscount,
  onCheckout,
}: CartSummaryProps) {
  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemDiscounts = items.reduce((sum, item) => sum + item.discount, 0);
  const afterItemDiscounts = subtotal - itemDiscounts;

  let billDiscount = discountAmount;
  if (discountType === 'percent') {
    billDiscount = (afterItemDiscounts * discountAmount) / 100;
  }

  const afterBillDiscount = afterItemDiscounts - billDiscount;
  const vatAmount = (afterBillDiscount * vatRate) / 100;
  const netAmount = afterBillDiscount + vatAmount;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-bold text-lg">ตะกร้าสินค้า ({items.length})</h3>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-auto p-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p>ไม่มีสินค้าในตะกร้า</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.product_id}
                className="p-3 bg-gray-50 rounded-lg group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product_name}</p>
                    <p className="text-gray-500 text-xs">{formatCurrency(item.price)}</p>
                  </div>
                  <button
                    onClick={() => onRemoveItem(item.product_id)}
                    className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateQuantity(item.product_id, -1)}
                      className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.product_id, 1)}
                      className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold text-lg"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right">
                    {item.discount > 0 && (
                      <p className="text-xs text-red-500">ลด {formatCurrency(item.discount)}</p>
                    )}
                    <p className="font-bold text-primary-600">{formatCurrency(item.subtotal)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">ยอดรวม</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>

        {(itemDiscounts > 0 || billDiscount > 0) && (
          <div className="flex justify-between text-sm text-red-500">
            <span>ส่วนลด</span>
            <span>-{formatCurrency(itemDiscounts + billDiscount)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">VAT {vatRate}%</span>
          <span>{formatCurrency(vatAmount)}</span>
        </div>

        <div className="border-t pt-2">
          <div className="flex justify-between text-lg font-bold">
            <span>ยอดสุทธิ</span>
            <span className="text-primary-600">{formatCurrency(netAmount)}</span>
          </div>
        </div>

        {/* Bill discount */}
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="ส่วนลด"
            value={discountAmount || ''}
            onChange={(e) => onUpdateBillDiscount(parseFloat(e.target.value) || 0, discountType)}
            className="input text-sm flex-1"
          />
          <select
            value={discountType}
            onChange={(e) => onUpdateBillDiscount(discountAmount, e.target.value as 'percent' | 'fixed')}
            className="input text-sm w-24"
          >
            <option value="fixed">฿</option>
            <option value="percent">%</option>
          </select>
        </div>

        {/* Checkout button */}
        <button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="w-full py-4 bg-primary-600 text-white font-bold text-lg rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          ชำระเงิร {formatCurrency(netAmount)}
        </button>
      </div>
    </div>
  );
}
