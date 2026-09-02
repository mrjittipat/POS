// จัดเก็บรูปโปรไฟล์ (avatar) ต่อ user ลง localStorage
// เก็บเป็น Data URL (base64) key ตาม user id เพื่อให้แต่ละ user มีรูปของตัวเอง

function keyFor(userId: number | undefined): string | null {
  return userId ? `avatar_user_${userId}` : null;
}

export function getAvatar(userId: number | undefined): string | null {
  const key = keyFor(userId);
  if (!key) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveAvatar(userId: number, dataUrl: string): void {
  const key = keyFor(userId);
  if (key) localStorage.setItem(key, dataUrl);
}

export function removeAvatar(userId: number): void {
  const key = keyFor(userId);
  if (key) localStorage.removeItem(key);
}