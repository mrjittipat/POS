// อ่านค่า Settings (ที่บันทึกในหน้า ตั้งค่า) เพื่อใช้ใน APP จริง

export interface AppSettings {
  store_brand_name: string;
  store_brand_tagline: string;
  store_address: string;
  store_phone: string;
  tax_id: string;
  vat_rate: string;
  receipt_footer: string;
}

const DEFAULTS: AppSettings = {
  store_brand_name: 'POS System',
  store_brand_tagline: 'ระบบขายหน้าร้าน',
  store_address: '',
  store_phone: '',
  tax_id: '',
  vat_rate: '7',
  receipt_footer: 'ขอบคุณที่ใช้บริการ',
};

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem('settings');
    const s = raw ? JSON.parse(raw) : {};
    return { ...DEFAULTS, ...s };
  } catch {
    return { ...DEFAULTS };
  }
}

// อัตรา VAT จากตั้งค่า (ถ้าใส่ 0 = ไม่มี VAT, ใส่ 7 = 7%)
export function getVatRate(): number {
  const v = parseFloat(getSettings().vat_rate);
  return Number.isFinite(v) && v >= 0 ? v : 7;
}

// ข้อความท้ายใบเสร็จ (จากตั้งค่า)
export function getReceiptFooter(): string {
  return getSettings().receipt_footer || DEFAULTS.receipt_footer;
}