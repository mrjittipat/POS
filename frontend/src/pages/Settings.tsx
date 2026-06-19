import { useState, useRef, useEffect } from 'react';
import { Save, Store, ImagePlus, Trash2, CreditCard } from 'lucide-react';
import { useDialog } from '../context/DialogContext';

export default function Settings() {
  const { toast } = useDialog();
  const [settings, setSettings] = useState({
    store_name: 'ร้านค้า POS System',
    store_address: '123 ถนนสุขุมวิท กรุงเทพฯ 10110',
    store_phone: '02-123-4567',
    tax_id: '0123456789012',
    vat_rate: '7',
    receipt_footer: 'ขอบคุณที่ใช้บริการ',
  });
  const [saved, setSaved] = useState(false);

  // PromptPay QR state
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [_qrFile, setQrFile] = useState<File | null>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Load saved settings and QR on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    const savedQr = localStorage.getItem('payment.promptpay_qr');
    if (savedQr) {
      setQrPreview(savedQr);
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('settings', JSON.stringify(settings));
    setSaved(true);
    toast({ message: 'บันทึกการตั้งค่าสำเร็จ', type: 'success' });
    setTimeout(() => setSaved(false), 3000);
  };

  const handleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast({ message: 'รองรับเฉพาะไฟล์ JPG และ PNG เท่านั้น', type: 'error' });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ message: 'ขนาดไฟล์ต้องไม่เกิน 5MB', type: 'error' });
      return;
    }

    setQrFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setQrPreview(result);
      // Save to localStorage immediately
      localStorage.setItem('payment.promptpay_qr', result);
      toast({ message: 'อัพโหลด QR Code สำเร็จ', type: 'success' });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveQr = () => {
    setQrPreview(null);
    setQrFile(null);
    localStorage.removeItem('payment.promptpay_qr');
    if (qrInputRef.current) {
      qrInputRef.current.value = '';
    }
    toast({ message: 'ลบ QR Code แล้ว', type: 'success' });
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
              value={settings.store_name}
              onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
              className="input"
            />
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
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">PromptPay QR Code</label>

            {/* QR Preview / Upload area */}
            <div className="flex items-start gap-5">
              <div
                className="w-40 h-40 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
                onClick={() => qrInputRef.current?.click()}
              >
                {qrPreview ? (
                  <img src={qrPreview} alt="QR Preview" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center">
                    <ImagePlus size={32} className="text-gray-300 mx-auto mb-1" />
                    <span className="text-xs text-gray-400">อัพโหลด QR</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <input
                  ref={qrInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleQrChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => qrInputRef.current?.click()}
                  className="btn btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <ImagePlus size={16} />
                  {qrPreview ? 'เปลี่ยน QR Code' : 'เลือก QR Code'}
                </button>

                {qrPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveQr}
                    className="btn w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 border border-red-200"
                  >
                    <Trash2 size={16} />
                    ลบ QR Code
                  </button>
                )}

                <p className="text-xs text-gray-400">
                  รองรับ: JPG, PNG (สูงสุด 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-700">
              <strong>วิธีใช้:</strong> อัพโหลดรูป QR Code จากธนาคารของคุณ จากนั้น QR จะแสดงในหน้าชำระเงิน POS โดยอัตโนมัติ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
