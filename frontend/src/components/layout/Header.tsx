import { useEffect, useRef } from 'react';
import { Bell, Trash2, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '../../store';
import { useNotificationStore } from '../../store/notifications';
import { posApi } from '../../api/pos.api';
import { formatCurrency } from '../../utils/format';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { user } = useAuthStore();
  const { items, isOpen, setItems, clearItems, toggleOpen, setOpen } = useNotificationStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasNotifications = items.length > 0;

  // Fetch today's sold items on mount
  useEffect(() => {
    fetchTodaySold();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setOpen]);

  const fetchTodaySold = async () => {
    try {
      const res = await posApi.getTodaySoldItems();
      const payload = res.data as { success: boolean; data: typeof items };
      if (payload.success) setItems(payload.data);
    } catch {
      // Silently fail
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={toggleOpen}
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell size={20} />
              {hasNotifications && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>

            {/* Dropdown */}
            {isOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={16} className="text-primary-600" />
                    <span className="font-semibold text-sm text-gray-700">สินค้าที่ขายวันนี้</span>
                    {hasNotifications && (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                        {items.length}
                      </span>
                    )}
                  </div>
                  {hasNotifications && (
                    <button
                      onClick={clearItems}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 size={12} />
                      ล้างทั้งหมด
                    </button>
                  )}
                </div>

                {/* Items list */}
                <div className="max-h-64 overflow-y-auto">
                  {hasNotifications ? (
                    items.map((item, index) => (
                      <div
                        key={`${item.product_name}-${index}`}
                        className="flex items-center justify-between px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.product_name}</p>
                          <p className="text-xs text-gray-400">
                            {item.quantity} ชิ้น • {formatCurrency(item.subtotal)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <ShoppingBag size={32} className="mb-2 opacity-50" />
                      <p className="text-sm">ยังไม่มีรายการขายวันนี้</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User avatar */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden md:block">
              <p className="font-medium text-sm">{user?.full_name}</p>
              <p className="text-gray-500 text-xs">{user?.username}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
