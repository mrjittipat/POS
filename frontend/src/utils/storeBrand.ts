// อ่านชื่อร้านและคำนำจาก localStorage (settings) ที่ตั้งค่าในหน้า Setting
// ถ้ายังไม่ได้ตั้งค่า ให้ใช้ค่า default เดิม

export interface StoreBrand {
  name: string;
  tagline: string;
}

export function getStoreBrand(): StoreBrand {
  try {
    const raw = localStorage.getItem('settings');
    const settings = raw ? JSON.parse(raw) : {};
    return {
      name: settings.store_brand_name || 'POS System',
      tagline: settings.store_brand_tagline || 'ระบบขายหน้าร้าน',
    };
  } catch {
    return { name: 'POS System', tagline: 'ระบบขายหน้าร้าน' };
  }
}