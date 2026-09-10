import { useState, useEffect } from 'react';
import { Save, Store, Trash2, CreditCard, RefreshCw, ArchiveRestore, QrCode } from 'lucide-react';
import { useDialog } from '../context/DialogContext';
import { posApi } from '../api/pos.api';
import { deductDrawerMoney, removeDrawerLogsByRef } from '../utils/posStorage';
import { formatCurrency } from '../utils/format';

export default function Settings() {
  const { toast, showConfirm } = useDialog();

  const handleResetSales = (scope: 'today' | 'all') => {
    const label = scope === 'all' ? 'ทั้งหมด (ทุกวัน)' : 'เฉพาะวันนี้';
    showConfirm({
      title: scope === 'all' ? 'รีเซ็ตยอดขายทั้งหมด' : 'รีเซ็ตยอดขายวันนี้',
      message:
        scope === 'all'
          ? 'แน่ใจว่าต้องการรีเซ็ตยอดขายทั้งหมด? จะลบบิลที่ขายมาแล้วทั้งหมด (ทุกวัน) และคืนสต็อกเข้าคลัง (ไม่สามารถย้อนกลับได้)'
          : 'แน่ใจว่าต้องการรีเซ็ตยอดขายวันนี้? จะลบบิลที่ขายวันนี้ทั้งหมด และคืนสต็อกเข้าคลัง (ไม่สามารถย้อนกลับได้)',
      variant: 'danger',
      confirmText: 'รีเซ็ต',
      onConfirm: async () => {
        try {
          const res = await posApi.resetSales(scope);
          const data = (res.data as { data?: { cashReset?: number; transactionCodes?: string[] }; message?: string }).data || {};
          let msg = (res.data as { message?: string })?.message || `รีเซ็ตยอดขาย${label}แล้ว`;

          // ลบเงินพักเฉพาะรายการจากบิลที่ถูกรีเซ็ต (ตามเลข transaction)
          const { removedCount, removedAmount } = removeDrawerLogsByRef(data.transactionCodes || []);
          if (removedCount > 0) {
            msg += ` (ลบเงินพักจากบิล ${removedCount} รายการ = ${formatCurrency(removedAmount)} บาท)`;
          } else if (data.cashReset && data.cashReset > 0) {
            // กรณี log เก่าไม่มีเลข transaction — หักรวมตามยอดเงินสด
            deductDrawerMoney(data.cashReset, 'หักออกตามยอดขายที่รีเซ็ต');
            msg += ` (หักเงินพัก ${formatCurrency(data.cashReset)} บาท)`;
          }
          toast({ message: msg, type: 'success' });
        } catch {
          toast({ message: 'เกิดข้อผิดพลาดในการรีเซ็ตยอดขาย', type: 'error' });
        }
      },
    });
  };
  const [settings, setSettings] = useState({
    store_name: 'ร้านค้า POS System',
    store_brand_name: 'POS System',
    store_brand_tagline: 'ระบบขายหน้าร้าน',
    store_address: '123 ถนนสุขุมวิท กรุงเทพฯ 10110',
    store_phone: '02-123-4567',
    tax_id: '0123456789012',
    vat_rate: '7',
    receipt_footer: 'ขอบคุณที่ใช้บริการ',
  });
  const [saved, setSaved] = useState(false);

  // โหมด QR: auto = เจนตามยอดผ่าน Paynoi | manual = รูปที่อัปโหลดเอง (สำรองตอน Paynoi ล่ม)
  const [qrMode, setQrMode] = useState<'auto' | 'manual'>(
    () => (localStorage.getItem('payment.qr_mode') as 'auto' | 'manual') || 'auto'
  );
  const [manualQr, setManualQr] = useState<string | null>(() =>
    localStorage.getItem('payment.promptpay_qr')
  );

  // Load saved settings and QR on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('settings', JSON.stringify(settings));
    setSaved(true);
    toast({ message: 'บันทึกการตั้งค่าสำเร็จ', type: 'success' });
    setTimeout(() => setSaved(false), 3000);
  };

  const handleQrModeChange = (mode: 'auto' | 'manual') => {
    setQrMode(mode);
    localStorage.setItem('payment.qr_mode', mode);
    toast({
      message: mode === 'auto' ? 'ใช้ QR อัตโนมัติ (Paynoi)' : 'ใช้ QR สำรองที่อัปโหลดเอง',
      type: 'success',
    });
  };

  const handleManualQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      toast({ message: 'ใช้ได้เฉพาะไฟล์ PNG/JPG', type: 'error' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ message: 'ไฟล์ใหญ่เกิน 2MB', type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setManualQr(dataUrl);
      localStorage.setItem('payment.promptpay_qr', dataUrl);
      toast({ message: 'อัปโหลด QR สำรองแล้ว', type: 'success' });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveQr = () => {
    localStorage.removeItem('payment.promptpay_qr');
    setManualQr(null);
    toast({ message: 'ลบ QR สำรองแล้ว', type: 'success' });
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Store Settings */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white">
            <Store size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold">ตั้งค่าระบบ</h2>
            <p className="text-gray-500 text-sm">ข้อมูลร้านค้าและการตั้งค่าต่างๆ</p>
          </div>
        </div>

        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
            <Save size={16} />
            บันทึกการตั้งค่าสำเร็จ
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อร้านค้า</label>
            <input
              type="text"
              value={settings.store_brand_name}
              disabled
              className="input bg-gray-100 text-gray-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              ล็อกตามชื่อร้านจากเมนู "เปลี่ยนชื่อร้าน &amp; คำนำ" (แก้ไขได้ที่ตรงนั้น)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่</label>
            <textarea
              value={settings.store_address}
              onChange={(e) => setSettings({ ...settings, store_address: e.target.value })}
              className="input"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร</label>
              <input
                type="tel"
                value={settings.store_phone}
                onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เลขประจำตัญผู้เสียภาษี</label>
              <input
                type="text"
                value={settings.tax_id}
                onChange={(e) => setSettings({ ...settings, tax_id: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">อัตรา VAT (%)</label>
              <input
                type="number"
                value={settings.vat_rate}
                onChange={(e) => setSettings({ ...settings, vat_rate: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ข้อความท้ายใบเสร็จ</label>
            <input
              type="text"
              value={settings.receipt_footer}
              onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
              className="input"
            />
          </div>

          <button type="submit" className="btn btn-primary flex items-center gap-2">
            <Save size={18} />
            บันทึกการตั้งค่า
          </button>
        </form>
      </div>

      {/* Store Brand - ชื่อร้าน & คำนำ */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white">
            <Store size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold">เปลี่ยนชื่อร้าน & คำนำ</h2>
            <p className="text-gray-500 text-sm">ชื่อร้านและคำนำที่แสดงที่เมนูด้านซ้ายและหน้าเข้าสู่ระบบ</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อร้าน</label>
            <input
              type="text"
              value={settings.store_brand_name}
              onChange={(e) => setSettings({ ...settings, store_brand_name: e.target.value })}
              className="input"
              placeholder="เช่น 7-Eleven, Lotus's"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">คำนำ</label>
            <input
              type="text"
              value={settings.store_brand_tagline}
              onChange={(e) => setSettings({ ...settings, store_brand_tagline: e.target.value })}
              className="input"
              placeholder="เช่น ระบบขายหน้าร้าน"
            />
          </div>

          <button type="button" onClick={handleSave} className="btn btn-primary flex items-center gap-2">
            <Save size={18} />
            บันทึกชื่อร้าน & คำนำ
          </button>
        </div>
      </div>

      {/* Payment Settings - PromptPay QR */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
            <CreditCard size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold">ตั้งค่าการชำระเงิน</h2>
            <p className="text-gray-500 text-sm">QR PromptPay สำหรับรับชำระเงิน</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* สวิตช์โหมด QR */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleQrModeChange('auto')}
              className={`py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
                qrMode === 'auto'
                  ? 'bg-white text-blue-700 shadow'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              QR อัตโนมัติ (Paynoi)
            </button>
            <button
              type="button"
              onClick={() => handleQrModeChange('manual')}
              className={`py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
                qrMode === 'manual'
                  ? 'bg-white text-amber-700 shadow'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              QR สำรอง (อัปโหลดเอง)
            </button>
          </div>

          {qrMode === 'auto' ? (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">PromptPay QR Code</label>

            {/* QR อัตโนมัติ — ไม่ต้องอัพโหลดรูปแล้ว */}
            <div className="flex items-start gap-5">
              <div className="w-40 h-40 rounded-xl border-2 border-solid border-green-300 flex items-center justify-center overflow-hidden bg-green-50">
                <div className="text-center px-2">
                  <QrCode size={32} className="text-green-500 mx-auto mb-1" />
                  <span className="text-xs text-green-700 font-semibold">QR อัตโนมัติ</span>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <p className="text-sm text-gray-600">
                  ระบบสร้าง QR PromptPay <strong>ตามยอดบิลอัตโนมัติ</strong> ตอนคิดเงิน
                  และตรวจว่าโอนเงินแล้วก่อนปิดบิล ไม่ต้องอัพโหลดรูปอีกต่อไป
                </p>

                <p className="text-xs text-gray-400">
                  ตั้งค่าเบอร์ PromptPay / Paynoi API ในไฟล์ .env ของ backend
                </p>
              </div>
            </div>
          </div>
          ) : (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">QR สำรอง (ใช้ตอน Paynoi ล่ม)</label>

            <div className="flex items-start gap-5">
              <div className="w-40 h-40 rounded-xl border-2 border-dashed border-amber-300 flex items-center justify-center overflow-hidden bg-amber-50">
                {manualQr ? (
                  <img src={manualQr} alt="QR สำรอง" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center px-2">
                    <QrCode size={32} className="text-amber-400 mx-auto mb-1" />
                    <span className="text-xs text-amber-600 font-semibold">ยังไม่มีรูป</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <p className="text-sm text-gray-600">
                  โหมดสำรอง: โชว์รูปนี้ให้ลูกค้าสแกน แล้ว<strong>กดปิดบิลเอง</strong> (ไม่มีตรวจยอดโอน)
                </p>

                <label className="btn w-full flex items-center justify-center gap-2 border border-gray-200 cursor-pointer">
                  อัปโหลดรูป QR (PNG/JPG ≤ 2MB)
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={handleManualQrChange}
                  />
                </label>

                {manualQr && (
                  <button
                    type="button"
                    onClick={handleRemoveQr}
                    className="btn w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 border border-red-200"
                  >
                    <Trash2 size={16} />
                    ลบรูป QR สำรอง
                  </button>
                )}
              </div>
            </div>
          </div>
          )}

          {/* Info box */}
          <div className={`rounded-xl p-4 border ${qrMode === 'auto' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <p className={`text-sm ${qrMode === 'auto' ? 'text-green-700' : 'text-amber-700'}`}>
              {qrMode === 'auto' ? (
                <><strong>วิธีใช้:</strong> เลือกชำระด้วย QR ในหน้าคิดเงิน ระบบจะสร้าง QR ตามยอดบิลให้ลูกค้าสแกน
                และปิดบิลอัตโนมัติเมื่อตรวจพบยอดโอน</>
              ) : (
                <><strong>โหมดสำรอง:</strong> หน้าคิดเงินจะโชว์รูป QR ที่อัปโหลดไว้
                พนักงานต้องเห็นเงินเข้าก่อนแล้วกดปิดบิลเอง — อย่าลืมสลับกลับโหมดอัตโนมัติเมื่อ Paynoi ปกติ</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* รีเซ็ตยอดขายทั้งหมด */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card p-6 border-red-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white">
              <RefreshCw size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">รีเซ็ตยอดขาย</h2>
              <p className="text-gray-500 text-sm">รีเซ็ตยอดขายวันนี้หรือทั้งหมด</p>
            </div>
          </div>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleResetSales('today')}
              className="btn w-full flex items-center justify-center gap-2 text-white bg-orange-500 hover:bg-orange-600"
            >
              <RefreshCw size={16} />
              รีเซ็ตยอดขายวันนี้
            </button>
            <button
              type="button"
              onClick={() => handleResetSales('all')}
              className="btn w-full flex items-center justify-center gap-2 text-white bg-red-600 hover:bg-red-700"
            >
              <Trash2 size={16} />
              รีเซ็ตทั้งหมด
            </button>
            <p className="text-xs text-gray-400">
              ลบรายการขายและคืนสต็อก (ย้อนกลับไม่ได้)
            </p>
          </div>
        </div>

        {/* กู้คืนสินค้าที่ลบ */}
        <div className="card p-6 border-blue-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
              <ArchiveRestore size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">กู้คืนสินค้า</h2>
              <p className="text-gray-500 text-sm">กู้คืนสินค้าที่ลบไปแล้ว</p>
            </div>
          </div>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => window.location.href = '/settings/archived'}
              className="btn w-full flex items-center justify-center gap-2 text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArchiveRestore size={16} />
              จัดการสินค้าที่ลบ
            </button>
            <p className="text-xs text-gray-400">
              ดูและกู้คืนสินค้าที่ลบไปแล้ว
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
