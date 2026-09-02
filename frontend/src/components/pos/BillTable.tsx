import { Minus, Plus, X, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

export interface BillItem {
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
}

interface BillTableProps {
  items: BillItem[];
  onUpdateQuantity: (productId: number, delta: number) => void;
  onRemoveItem: (productId: number) => void;
}

// Table header labels fixed per the design spec.
const HEADERS = ['No.', 'ชื่อสินค้า', 'จำนวน', 'ราคา/หน่วย'];

export default function BillTable({ items, onUpdateQuantity, onRemoveItem }: BillTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
        <ShoppingBag size={52} className="mb-3 opacity-50" />
        <p className="text-sm">ยังไม่มีสินค้าในบิล</p>
        <p className="text-xs mt-1">ไปที่แท็บ "สินค้า" แล้วเลือกสินค้าเพื่อเพิ่ม</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-gray-50 text-gray-600 uppercase tracking-wide text-xs">
          <tr className="border-b border-gray-300">
            {HEADERS.map((h) => (
              <th key={h} className="text-left font-semibold px-3 py-2.5 whitespace-nowrap">
                {h}
              </th>
            ))}
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.product_id} className="border-b border-gray-200 hover:bg-gray-50">
              <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap w-10">{idx + 1}</td>
              <td className="px-3 py-2.5 font-medium min-w-[160px]">{item.product_name}</td>
              {/* Quantity controls */}
              <td className="px-3 py-2.5 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onUpdateQuantity(item.product_id, -1)}
                    className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 active:bg-gray-200"
                    title="ลดจำนวน"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-9 text-center font-semibold tabular-nums">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.product_id, 1)}
                    className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 active:bg-gray-200"
                    title="เพิ่มจำนวน"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </td>
              <td className="px-3 py-2.5 text-right font-semibold tabular-nums whitespace-nowrap">
                {formatCurrency(item.price * item.quantity)}
              </td>
              <td className="px-2 py-2.5">
                <button
                  onClick={() => onRemoveItem(item.product_id)}
                  className="w-7 h-7 flex items-center justify-center rounded text-red-500 hover:bg-red-50"
                  title="ลบสินค้า"
                >
                  <X size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
