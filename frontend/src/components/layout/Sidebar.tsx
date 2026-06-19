import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderOpen,
  Warehouse,
  FileBarChart,
  Users,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store';

const menuItems = [
  { to: '/', icon: LayoutDashboard, label: 'แดชบอร์ด' },
  { to: '/pos', icon: ShoppingCart, label: 'การขาย' },
  { to: '/products', icon: Package, label: 'สินค้า' },
  { to: '/categories', icon: FolderOpen, label: 'หมวดหมู่' },
  { to: '/inventory', icon: Warehouse, label: 'สต๊อก' },
  { to: '/reports', icon: FileBarChart, label: 'รายงาน' },
];

const adminItems = [
  { to: '/users', icon: Users, label: 'ผู้ใช้งาน' },
  { to: '/settings', icon: Settings, label: 'ตั้งค่า' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold">POS System</h1>
        <p className="text-gray-400 text-sm mt-1">ระบบขายหน้าร้าน</p>
      </div>

      {/* User info */}
      <div className="p-4 border-b border-gray-700">
        <p className="font-medium">{user?.full_name}</p>
        <p className="text-gray-400 text-sm">{user?.role === 'admin' ? 'ผู้ดูแลระบบ' : user?.role === 'manager' ? 'ผู้จัดการ' : 'พนักงานขาย'}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`
                }
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}

          {isAdmin && (
            <>
              <li className="pt-4 pb-2 px-4 text-xs text-gray-500 uppercase tracking-wider">
                จัดการระบบ
              </li>
              {adminItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800'
                      }`
                    }
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </>
          )}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
        >
          <LogOut size={20} />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  );
}
