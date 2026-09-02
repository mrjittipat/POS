import {
  Ban,
  Search,
  PauseCircle,
  RotateCcw,
  Wallet,
  ArrowLeftRight,
  BarChart3,
  CornerDownLeft,
  type LucideIcon,
} from 'lucide-react';

interface PosSidebarProps {
  hasItems: boolean;
  onCancelSale: () => void;
  onCheckProduct: () => void;
  onParkBill: () => void;
  onRecall: () => void;
  onManageMoney: () => void;
  onAdjustMoney: () => void;
  onShiftSummary: () => void;
  onEnter: () => void;
  canAdjust?: boolean; // พนักงานขาย false = ดูเงินได้อย่างเดียว ไม่เห็นปุ่มลด/เพิ่ม
}

interface SideButton {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant: 'primary' | 'danger' | 'neutral' | 'orange';
  disabled?: boolean;
}

export default function PosSidebar({
  hasItems,
  onCancelSale,
  onCheckProduct,
  onParkBill,
  onRecall,
  onManageMoney,
  onAdjustMoney,
  onShiftSummary,
  onEnter,
  canAdjust = true,
}: PosSidebarProps) {
  const group1: SideButton[] = [
    { label: 'ยกเลิกการขาย', icon: Ban, onClick: onCancelSale, variant: 'danger', disabled: !hasItems },
    { label: 'ตรวจสอบสินค้า', icon: Search, onClick: onCheckProduct, variant: 'primary' },
    { label: 'พักบิล', icon: PauseCircle, onClick: onParkBill, variant: 'neutral', disabled: !hasItems },
    { label: 'เรียกคืน', icon: RotateCcw, onClick: onRecall, variant: 'orange' },
  ];

  const group2: SideButton[] = [
    { label: 'จัดการเงินพัก', icon: Wallet, onClick: onManageMoney, variant: 'primary' },
    ...(canAdjust
      ? [{ label: 'ลด/เพิ่มเงิน', icon: ArrowLeftRight, onClick: onAdjustMoney, variant: 'neutral' }]
      : []),
    { label: 'Shift Summary', icon: BarChart3, onClick: onShiftSummary, variant: 'neutral' },
  ] as SideButton[];

  const variantClass = (v: SideButton['variant']) => {
    switch (v) {
      case 'danger':
        return 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:bg-gray-100 disabled:text-gray-300 disabled:border-gray-200';
      case 'primary':
        return 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100';
      case 'orange':
        return 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100';
      default:
        return 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-300';
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {[group1, group2].map((group, gi) => (
        <div key={gi} className="border border-gray-300 rounded-lg p-2 grid grid-cols-2 gap-2">
          {group.map((b) => (
            <button
              key={b.label}
              onClick={b.onClick}
              disabled={b.disabled}
              className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-md border text-xs font-semibold transition-colors disabled:cursor-not-allowed ${variantClass(
                b.variant
              )}`}
            >
              <b.icon size={20} strokeWidth={1.8} />
              <span className="leading-tight text-center">{b.label}</span>
            </button>
          ))}
          {/* fill empty grid cell in group 2 (5th slot) */}
          {gi === 1 && group2.length % 2 === 1 && <div />}
        </div>
      ))}

      {/* Enter button */}
      <button
        onClick={onEnter}
        disabled={!hasItems}
        className="mt-auto flex items-center justify-center gap-2 py-4 rounded-lg bg-sky-500 text-white text-lg font-bold hover:bg-sky-600 active:bg-sky-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
      >
        <CornerDownLeft size={22} strokeWidth={2.2} />
        Enter
      </button>

      {/* Status footer */}
      <div className="flex items-center gap-2 text-xs text-gray-400 border-t border-gray-200 pt-2">
        <span className="px-1.5 py-0.5 border border-gray-300 rounded">ESC</span>
        <span>ยกเลิก / กลับ</span>
      </div>
    </div>
  );
}
