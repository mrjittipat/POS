import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store';
import { Lock, User, Eye, EyeOff, LogIn, Store, KeyRound } from 'lucide-react';
import { getStoreBrand } from '../utils/storeBrand';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { name: storeName, tagline: storeTagline } = getStoreBrand();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login({ username, password });
      const { user, tokens } = response.data.data;
      setAuth(user, tokens.accessToken, tokens.refreshToken);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md relative">
      {/* Mobile brand (ซ่อนตอนหน้าจอใหญ่ เพราะฝั่งซ้ายแสดงอยู่แล้ว) */}
      <div className="lg:hidden flex flex-col items-center mb-6">
        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-white mb-3 shadow-lg shadow-primary-500/40">
          <Store size={28} />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">{storeName}</h1>
        <p className="text-gray-500 mt-1">{storeTagline}</p>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl shadow-primary-900/10 border border-gray-100 overflow-hidden">
        {/* top accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-primary-400 via-primary-600 to-primary-700" />

        <div className="p-8 sm:p-9">
          {/* Header */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-gray-800">เข้าสู่ระบบ</h2>
            <p className="text-gray-500 text-sm mt-1">กรอกข้อมูลเพื่อเข้าใช้งานระบบ POS</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-5 text-sm">
              <span className="mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ชื่อผู้ใช้</label>
              <div className="relative group">
                <User
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-600 transition-colors"
                  size={18}
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all placeholder:text-gray-400"
                  placeholder="กรอกชื่อผู้ใช้"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">รหัสผ่าน</label>
              <div className="relative group">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-600 transition-colors"
                  size={18}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all placeholder:text-gray-400"
                  placeholder="กรอกรหัสผ่าน"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-primary-600 transition-colors"
                  title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold rounded-xl hover:from-primary-700 hover:to-primary-800 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 transition-all shadow-lg shadow-primary-600/30"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  เข้าสู่ระบบ
                </>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 flex items-center gap-3 p-3.5 bg-primary-50 border border-primary-100 rounded-xl">
            <span className="w-9 h-9 rounded-lg bg-primary-600/10 flex items-center justify-center text-primary-600 shrink-0">
              <KeyRound size={16} />
            </span>
            <div className="text-sm text-primary-800 min-w-0">
              <p className="font-semibold">บัญชีทดลองใช้งาน</p>
              <p className="text-primary-600/90 text-xs mt-0.5">
                ชื่อผู้ใช้ <strong>admin</strong> · รหัสผ่าน <strong>admin123</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-gray-400 mt-5">
        {storeName} · {storeTagline}
      </p>
    </div>
  );
}