import { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import { ROLE_NAMES } from '../utils/constants';
import { Plus, Edit, Trash2, X, Shield, KeyRound, UserCircle } from 'lucide-react';
import { useDialog } from '../context/DialogContext';
import api from '../api/axios';

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export default function Users() {
  const { showConfirm, toast } = useDialog();
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showResetPassword, setShowResetPassword] = useState<number | null>(null);
  const [resetPasswordOld, setResetPasswordOld] = useState('');
  const [resetPasswordNew, setResetPasswordNew] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'cashier',
    phone: '',
  });
  const { user: currentUser } = useAuthStore();

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers((response.data as { success: boolean; data: User[] }).data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingId) {
      if (!formData.password || formData.password.length < 6) {
        toast({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', type: 'warning' });
        return;
      }
      if (!formData.username || formData.username.trim().length < 3) {
        toast({ message: 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร', type: 'warning' });
        return;
      }
    }
    if (!formData.full_name || formData.full_name.trim().length < 2) {
      toast({ message: 'กรุณาระบุชื่อ-นามสกุล', type: 'warning' });
      return;
    }

    try {
      if (editingId) {
        await api.put(`/users/${editingId}`, {
          full_name: formData.full_name,
          role: formData.role,
          phone: formData.phone,
        });
      } else {
        await api.post('/users', {
          username: formData.username.trim(),
          password: formData.password,
          full_name: formData.full_name.trim(),
          role: formData.role,
          phone: formData.phone || null,
        });
      }
      resetForm();
      loadUsers();
      toast({ message: editingId ? 'แก้ไขผู้ใช้สำเร็จ' : 'เพิ่มผู้ใช้สำเร็จ', type: 'success' });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({ message: err.response?.data?.message || 'เกิดข้อผิดพลาด', type: 'error' });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordOld || resetPasswordOld.length < 1) {
      toast({ message: 'กรุณาใส่รหัสผ่านเดิม', type: 'warning' });
      return;
    }
    if (!resetPasswordNew || resetPasswordNew.length < 6) {
      toast({ message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร', type: 'warning' });
      return;
    }
    if (resetPasswordNew !== resetPasswordConfirm) {
      toast({ message: 'รหัสผ่านใหม่ไม่ตรงกัน', type: 'warning' });
      return;
    }
    if (resetPasswordOld === resetPasswordNew) {
      toast({ message: 'รหัสผ่านใหม่ต้องไม่เหมือนรหัสผ่านเดิม', type: 'warning' });
      return;
    }
    try {
      await api.put(`/users/${showResetPassword}/reset-password`, {
        oldPassword: resetPasswordOld,
        newPassword: resetPasswordNew,
      });
      toast({ message: 'เปลี่ยนรหัสผ่านสำเร็จ', type: 'success' });
      setShowResetPassword(null);
      setResetPasswordOld('');
      setResetPasswordNew('');
      setResetPasswordConfirm('');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({ message: err.response?.data?.message || 'เกิดข้อผิดพลาด', type: 'error' });
    }
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({
      username: user.username,
      password: '',
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || '',
    });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (id === currentUser?.id) {
      toast({ message: 'ไม่สามารถลบบัญชีตัวเองได้', type: 'warning' });
      return;
    }
    showConfirm({
      title: 'ลบผู้ใช้',
      message: 'ต้องการลบผู้ใช้นี้? การกระทำนี้ไม่สามารถย้อนกลับได้',
      variant: 'danger',
      confirmText: 'ลบ',
      onConfirm: async () => {
        try {
          await api.delete(`/users/${id}`);
          loadUsers();
          toast({ message: 'ลบผู้ใช้สำเร็จ', type: 'success' });
        } catch (error) {
          toast({ message: 'เกิดข้อผิดพลาดในการลบ', type: 'error' });
        }
      },
    });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ username: '', password: '', full_name: '', role: 'cashier', phone: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">ผู้ใช้งาน ({users.length})</h2>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
          <Plus size={18} />
          เพิ่มผู้ใช้
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">ชื่อ</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">ชื่อผู้ใช้</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">บทบาท</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">เบอร์โทร</th>
              <th className="text-center py-3 px-4 text-gray-600 font-medium">สถานะ</th>
              <th className="text-center py-3 px-4 text-gray-600 font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{user.full_name}</td>
                <td className="py-3 px-4 text-gray-500">{user.username}</td>
                <td className="py-3 px-4">
                  <span className="flex items-center gap-1">
                    <Shield size={14} className="text-primary-600" />
                    {ROLE_NAMES[user.role] || user.role}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-500">{user.phone || '-'}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {user.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex justify-center gap-1">
                    <button onClick={() => handleEdit(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="แก้ไข">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => { setShowResetPassword(user.id); setResetPasswordOld(''); setResetPasswordNew(''); setResetPasswordConfirm(''); }} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg" title="เปลี่ยนรหัสผ่าน">
                      <KeyRound size={16} />
                    </button>
                    <button onClick={() => handleDelete(user.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="ลบ">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">ไม่พบผู้ใช้งาน</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit user form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={resetForm}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                  <UserCircle size={20} className="text-primary-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {editingId ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
                </h3>
              </div>
              <button
                onClick={resetForm}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อ-นามสกุล *</label>
                <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="input focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" placeholder="ชื่อ-นามสกุล" required autoFocus />
              </div>
              {!editingId && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อผู้ใช้ *</label>
                  <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="input focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" placeholder="Username" required minLength={3} />
                </div>
              )}
              {!editingId && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">รหัสผ่าน *</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="input focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" placeholder="อย่างน้อย 6 ตัวอักษร" required minLength={6} />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">บทบาท</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="input focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                  <option value="cashier">พนักงานขาย</option>
                  <option value="manager">ผู้จัดการ</option>
                  <option value="admin">ผู้ดูแลระบบ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">เบอร์โทร</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" placeholder="0XX-XXX-XXXX" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="btn btn-secondary flex-1">ยกเลิก</button>
                <button type="submit" className="btn btn-primary flex-1">{editingId ? 'บันทึก' : 'เพิ่มผู้ใช้'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {showResetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowResetPassword(null); setResetPasswordOld(''); setResetPasswordNew(''); setResetPasswordConfirm(''); }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <KeyRound size={20} className="text-orange-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">เปลี่ยนรหัสผ่าน</h3>
              </div>
              <button
                onClick={() => { setShowResetPassword(null); setResetPasswordOld(''); setResetPasswordNew(''); setResetPasswordConfirm(''); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-5">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-sm text-gray-500">ผู้ใช้</p>
                <p className="font-bold text-gray-900">{users.find(u => u.id === showResetPassword)?.full_name}</p>
                <p className="text-sm text-gray-400">@{users.find(u => u.id === showResetPassword)?.username}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">รหัสผ่านเดิม *</label>
                <input
                  type="password"
                  value={resetPasswordOld}
                  onChange={(e) => setResetPasswordOld(e.target.value)}
                  className="input focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="ใส่รหัสผ่านปัจจุบัน"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">รหัสผ่านใหม่ *</label>
                <input
                  type="password"
                  value={resetPasswordNew}
                  onChange={(e) => setResetPasswordNew(e.target.value)}
                  className="input focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ยืนยันรหัสผ่านใหม่ *</label>
                <input
                  type="password"
                  value={resetPasswordConfirm}
                  onChange={(e) => setResetPasswordConfirm(e.target.value)}
                  className="input focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="ใส่รหัสผ่านใหม่อีกครั้ง"
                  required
                  minLength={6}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowResetPassword(null); setResetPasswordOld(''); setResetPasswordNew(''); setResetPasswordConfirm(''); }} className="btn btn-secondary flex-1">ยกเลิก</button>
                <button type="submit" className="btn btn-primary flex-1">เปลี่ยนรหัสผ่าน</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
