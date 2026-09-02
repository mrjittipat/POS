import { useState, useRef } from 'react';
import { Save, User, Lock, KeyRound, Camera, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store';
import { authApi } from '../api/auth.api';
import { useDialog } from '../context/DialogContext';
import { ROLE_NAMES } from '../utils/constants';
import { getAvatar, saveAvatar, removeAvatar } from '../utils/avatar';
import Avatar from '../components/Avatar';

export default function Profile() {
  const { user, setUser } = useAuthStore();
  const { toast } = useDialog();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState<string | null>(() => (user ? getAvatar(user.id) : null));
  const [saving, setSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast({ message: 'รองรับเฉพาะไฟล์ JPG และ PNG เท่านั้น', type: 'error' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ message: 'ขนาดไฟล์ต้องไม่เกิน 2MB', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      saveAvatar(user.id, dataUrl);
      setAvatar(dataUrl);
      toast({ message: 'อัปเดตรูปโปรไฟล์สำเร็จ', type: 'success' });
    };
    reader.readAsDataURL(file);

    // Reset input เพื่อให้เลือกไฟล์เดิมซ้ำได้
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    if (!user || !avatar) return;
    removeAvatar(user.id);
    setAvatar(null);
    toast({ message: 'ลบรูปโปรไฟล์แล้ว', type: 'success' });
  };

  // Change password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast({ message: 'กรุณาระบุชื่อ-นามสกุล', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const res = await authApi.updateProfile({ full_name: fullName.trim(), phone: phone.trim() });
      const payload = res.data;
      if (payload.success && payload.data) {
        setUser(payload.data);
        toast({ message: 'อัปเดตโปรไฟล์สำเร็จ', type: 'success' });
      }
    } catch {
      toast({ message: 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      toast({ message: 'กรุณาระบุรหัสผ่านเดิม', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ message: 'รหัสผ่านใหม่ไม่ตรงกัน', type: 'error' });
      return;
    }

    setChangingPwd(true);
    try {
      await authApi.changePassword(oldPassword, newPassword);
      toast({ message: 'เปลี่ยนรหัสผ่านสำเร็จ', type: 'success' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ message: msg || 'เปลี่ยนรหัสผ่านไม่สำเร็จ', type: 'error' });
    } finally {
      setChangingPwd(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile header */}
      <div className="card p-6">
        <div className="flex items-center gap-5">
          {/* Editable avatar */}
          <div className="relative">
            <Avatar userId={user?.id} name={fullName} className="w-20 h-20 text-3xl" />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center border-2 border-white hover:bg-primary-700 transition-colors"
              title="เปลี่ยนรูปโปรไฟล์"
            >
              <Camera size={14} />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold">{user?.full_name}</h2>
            <p className="text-gray-500 text-sm">@{user?.username} • {ROLE_NAMES[user?.role || ''] || user?.role}</p>
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                เปลี่ยนรูปโปรไฟล์
              </button>
              {avatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 font-medium"
                >
                  <Trash2 size={14} />
                  ลบรูป
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">รองรับ: JPG, PNG (สูงสุด 2MB)</p>
          </div>
        </div>
      </div>

      {/* Profile info */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white">
            <User size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold">การตั้งค่าโปรไฟล์</h2>
            <p className="text-gray-500 text-sm">แก้ไขข้อมูลส่วนตัวของบัญชีคุณ</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้ใช้ (Username)</label>
            <input type="text" value={user?.username || ''} disabled className="input bg-gray-100 text-gray-500" />
            <p className="text-xs text-gray-400 mt-1">ชื่อผู้ใช้ไม่สามารถแก้ไขได้</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              placeholder="ชื่อ-นามสกุล"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder="เบอร์โทรศัพท์"
            />
          </div>

          <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={saving}>
            <Save size={18} />
            {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
            <Lock size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold">เปลี่ยนรหัสผ่าน</h2>
            <p className="text-gray-500 text-sm">อัปเดตรหัสผ่านสำหรับการเข้าสู่ระบบ</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านเดิม</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="input"
              placeholder="รหัสผ่านเดิม"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านใหม่</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
                placeholder="อย่างน้อย 6 ตัวอักษร"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="ยืนยันรหัสผ่านใหม่"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-secondary flex items-center gap-2" disabled={changingPwd}>
            <KeyRound size={18} />
            {changingPwd ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
          </button>
        </form>
      </div>
    </div>
  );
}
