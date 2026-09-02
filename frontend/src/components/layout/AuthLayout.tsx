import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { Store, ShoppingCart, BarChart3, BellRing, ShieldCheck } from 'lucide-react';
import { getStoreBrand } from '../../utils/storeBrand';

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const { name, tagline } = getStoreBrand();

  const features = [
    { icon: ShoppingCart, text: 'ขายหน้าร้าน รวดเร็ว แม่นยำ' },
    { icon: BarChart3, text: 'รายงานยอดขาย รายวัน / เดือน / ปี' },
    { icon: BellRing, text: 'แจ้งเตือนสินค้าที่ขายวันนี้' },
    { icon: ShieldCheck, text: 'จัดการสิทธิ์ผู้ใช้งานอย่างปลอดภัย' },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* ===== Left branding panel (desktop) ===== */}
      <div className="hidden lg:flex w-[45%] relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary-600 to-primary-500 text-white flex-col justify-between p-10">
        {/* decorative blobs */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute top-1/2 -left-32 w-72 h-72 rounded-full bg-primary-400/30 blur-3xl" />
        <div className="absolute -bottom-28 -right-10 w-80 h-80 rounded-full bg-white/10 blur-2xl" />
        {/* subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        {/* Brand */}
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center shadow-lg">
            <Store size={26} />
          </div>
          <div>
            <p className="text-2xl font-bold leading-tight">{name}</p>
            <p className="text-white/70 text-sm">{tagline}</p>
          </div>
        </div>

        {/* Hero */}
        <div className="relative">
          <h2 className="text-4xl font-bold leading-snug mb-3">
            ยินดีต้อนรับกลับ
            <span className="block text-white/90">ผู้ประกอบการร้านค้า</span>
          </h2>
          <p className="text-white/80">เข้าสู่ระบบเพื่อจัดการร้านค้าของคุณ ให้ง่ายและมีประสิทธิภาพ</p>
        </div>

        {/* Features */}
        <ul className="relative space-y-4">
          {features.map((f) => (
            <li key={f.text} className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                <f.icon size={18} />
              </span>
              <span className="text-white text-sm font-medium">{f.text}</span>
            </li>
          ))}
        </ul>

        {/* Footer */}
        <p className="relative text-white/50 text-xs">
          © {new Date().getFullYear()} {name} · {tagline}
        </p>
      </div>

      {/* ===== Right: login form panel ===== */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-gray-50 via-white to-primary-50/60 relative overflow-hidden">
        {/* decorative circle behind card */}
        <div className="absolute top-16 right-16 w-40 h-40 rounded-full bg-primary-100/50 blur-3xl" />
        <div className="absolute bottom-16 left-16 w-52 h-52 rounded-full bg-primary-200/30 blur-3xl" />
        <Outlet />
      </div>
    </div>
  );
}