import pool from '../config/database';
import { Category } from '../models/types';

/**
 * Categories Service
 * จัดการหมวดหมู่สินค้า
 */

// Get all categories
export async function getCategories(): Promise<Category[]> {
  const [rows] = await pool.execute(
    'SELECT * FROM categories ORDER BY name ASC'
  );
  return rows as Category[];
}

// Get category by ID
export async function getCategoryById(id: number): Promise<Category | null> {
  const [rows] = await pool.execute('SELECT * FROM categories WHERE id = ?', [id]);
  const categories = rows as Category[];
  return categories.length > 0 ? categories[0] : null;
}

// Create category
export async function createCategory(data: {
  name: string;
  description?: string;
  is_active?: boolean;
}): Promise<number> {
  const [result] = await pool.execute(
    'INSERT INTO categories (name, description, is_active) VALUES (?, ?, ?)',
    [data.name, data.description || null, data.is_active === false ? 0 : 1]
  );
  return (result as { insertId: number }).insertId;
}

// Update category
export async function updateCategory(
  id: number,
  data: { name?: string; description?: string; is_active?: boolean }
): Promise<boolean> {
  const fields: string[] = [];
  const values: (string | number | boolean | null)[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }
  if (data.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(data.is_active ? 1 : 0);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const [result] = await pool.execute(
    `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return (result as { affectedRows: number }).affectedRows > 0;
}

// Delete category
export async function deleteCategory(id: number): Promise<boolean> {
  const [result] = await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
  return (result as { affectedRows: number }).affectedRows > 0;
}
