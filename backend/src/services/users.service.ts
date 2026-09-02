import pool from '../config/database';
import { User } from '../models/types';
import { hashPassword } from '../utils/password.util';

/**
 * Users Service
 * จัดการข้อมูลผู้ใช้งาน
 */

// Get all users with pagination (manager ดูได้เฉพาะพนักงานขาย)
export async function getUsers(
  page: number = 1,
  limit: number = 20,
  role?: 'admin' | 'manager' | 'cashier'
): Promise<{ users: Omit<User, 'password'>[]; total: number }> {
  const offset = (page - 1) * limit;

  const whereClause = role ? 'WHERE role = ?' : '';
  const params = role ? [role] : [];

  const [countRows] = await pool.execute(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
  const total = (countRows as { total: number }[])[0].total;

  const [rows] = await pool.execute(
    `SELECT id, username, full_name, role, phone, is_active, created_at, updated_at FROM users ${whereClause} ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );

  return {
    users: rows as Omit<User, 'password'>[],
    total,
  };
}

// Create user
export async function createUser(data: {
  username: string;
  password: string;
  full_name: string;
  role: 'admin' | 'manager' | 'cashier';
  phone?: string;
}): Promise<number> {
  const hashedPassword = await hashPassword(data.password);

  const [result] = await pool.execute(
    'INSERT INTO users (username, password, full_name, role, phone) VALUES (?, ?, ?, ?, ?)',
    [data.username, hashedPassword, data.full_name, data.role, data.phone || null]
  );

  return (result as { insertId: number }).insertId;
}

// Update user
export async function updateUser(
  id: number,
  data: {
    full_name?: string;
    role?: 'admin' | 'manager' | 'cashier';
    phone?: string;
    is_active?: boolean;
  },
  actorIsManager: boolean = false
): Promise<boolean> {
  const fields: string[] = [];
  const values: (string | number | boolean)[] = [];

  if (data.full_name !== undefined) {
    fields.push('full_name = ?');
    values.push(data.full_name);
  }
  if (actorIsManager) {
    // manager: บังคับให้เป็นพนักงานขาย (ยกระดับไม่ได้) และจัดการได้เฉพาะพนักงานขาย
    fields.push('role = ?');
    values.push('cashier');
  } else if (data.role !== undefined) {
    fields.push('role = ?');
    values.push(data.role);
  }
  if (data.phone !== undefined) {
    fields.push('phone = ?');
    values.push(data.phone);
  }
  if (data.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(data.is_active ? 1 : 0);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const scope = actorIsManager ? " AND role = 'cashier'" : '';
  const [result] = await pool.execute(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?${scope}`,
    values
  );

  return (result as { affectedRows: number }).affectedRows > 0;
}

// Delete user (manager ลบได้เฉพาะพนักงานขาย)
export async function deleteUser(id: number, actorIsManager: boolean = false): Promise<boolean> {
  const scope = actorIsManager ? " AND role = 'cashier'" : '';
  const [result] = await pool.execute(`DELETE FROM users WHERE id = ?${scope}`, [id]);
  return (result as { affectedRows: number }).affectedRows > 0;
}

// Reset password (with old password verification) — manager เปลี่ยนได้เฉพาะพนักงานขาย
export async function resetPassword(
  id: number,
  oldPassword: string,
  newPassword: string,
  actorIsManager: boolean = false
): Promise<{ success: boolean; message: string }> {
  // Get current user
  const scope = actorIsManager ? " AND role = 'cashier'" : '';
  const [rows] = await pool.execute(`SELECT password FROM users WHERE id = ?${scope}`, [id]);
  const users = rows as { password: string }[];

  if (users.length === 0) {
    return { success: false, message: 'ไม่พบผู้ใช้งาน' };
  }

  // Verify old password
  const bcrypt = await import('bcryptjs');
  const isMatch = await bcrypt.compare(oldPassword, users[0].password);

  if (!isMatch) {
    return { success: false, message: 'รหัสผ่านเดิมไม่ถูกต้อง' };
  }

  // Hash and update new password
  const hashedPassword = await hashPassword(newPassword);
  const [result] = await pool.execute('UPDATE users SET password = ? WHERE id = ?', [
    hashedPassword,
    id,
  ]);

  return {
    success: (result as { affectedRows: number }).affectedRows > 0,
    message: 'เปลี่ยนรหัสผ่านสำเร็จ',
  };
}
