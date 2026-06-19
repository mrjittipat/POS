import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles: Record<string, string> = {
  '/': 'แดชบอร์ด',
  '/pos': 'การขายหน้าร้าน',
  '/products': 'จัดการสินค้า',
  '/categories': 'หมวดหมู่สินค้า',
  '/inventory': 'สต๊อกสินค้า',
  '/reports': 'รายงาน',
  '/users': 'จัดการผู้ใช้งาน',
  '/settings': 'ตั้งค่าระบบ',
};

export default function MainLayout() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const pathname = location.pathname;
  const title = pageTitles[pathname] || 'POS System';

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={title} />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
