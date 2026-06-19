import pool from '../config/database';
import { Product } from '../models/types';
import { generateBarcode } from '../utils/barcode.util';

/**
 * Products Service
 * จัดการข้อมูลสินค้า
 */

// Get products with pagination and search
export async function getProducts(
  page: number = 1,
  limit: number = 20,
  search?: string,
  categoryId?: number
): Promise<{ products: Product[]; total: number }> {
  const offset = (page - 1) * limit;
  let whereClause = 'WHERE p.is_active = TRUE';
  const params: (string | number)[] = [];

  if (search) {
    whereClause += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (categoryId) {
    whereClause += ' AND p.category_id = ?';
    params.push(categoryId);
  }

  const countParams = [...params];
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) as total FROM products p ${whereClause}`,
    countParams
  );
  const total = (countRows as { total: number }[])[0].total;

  const [rows] = await pool.execute(
    `SELECT p.*, c.name as category_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );

  return { products: rows as Product[], total };
}

// Get product by ID
export async function getProductById(id: number): Promise<Product | null> {
  const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [id]);
  const products = rows as Product[];
  return products.length > 0 ? products[0] : null;
}

// Get product by barcode
export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const [rows] = await pool.execute(
    'SELECT * FROM products WHERE barcode = ? AND is_active = TRUE',
    [barcode]
  );
  const products = rows as Product[];
  return products.length > 0 ? products[0] : null;
}

// Create product
export async function createProduct(data: {
  category_id?: number;
  name: string;
  sku?: string;
  barcode?: string;
  image_url?: string;
  price: number;
  cost?: number;
  unit?: string;
}): Promise<number> {
  // Auto-generate barcode if not provided
  const barcode = data.barcode || generateBarcode();

  const [result] = await pool.execute(
    `INSERT INTO products (category_id, name, sku, barcode, image_url, price, cost, unit)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.category_id || null,
      data.name,
      data.sku || null,
      barcode,
      data.image_url || null,
      data.price,
      data.cost || 0,
      data.unit || 'ชิ้น',
    ]
  );

  const productId = (result as { insertId: number }).insertId;

  // Create initial inventory record
  await pool.execute(
    'INSERT INTO inventory (product_id, quantity, min_stock) VALUES (?, 0, 5)',
    [productId]
  );

  return productId;
}

// Update product
export async function updateProduct(
  id: number,
  data: {
    category_id?: number;
    name?: string;
    sku?: string;
    barcode?: string;
    image_url?: string | null;
    price?: number;
    cost?: number;
    unit?: string;
    is_active?: boolean;
  }
): Promise<boolean> {
  const fields: string[] = [];
  const values: (string | number | boolean | null)[] = [];

  if (data.category_id !== undefined) {
    fields.push('category_id = ?');
    values.push(data.category_id);
  }
  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.sku !== undefined) {
    fields.push('sku = ?');
    values.push(data.sku);
  }
  if (data.barcode !== undefined) {
    fields.push('barcode = ?');
    values.push(data.barcode);
  }
  if (data.image_url !== undefined) {
    fields.push('image_url = ?');
    values.push(data.image_url);  // Can be string path or null to remove
  }
  if (data.price !== undefined) {
    fields.push('price = ?');
    values.push(data.price);
  }
  if (data.cost !== undefined) {
    fields.push('cost = ?');
    values.push(data.cost);
  }
  if (data.unit !== undefined) {
    fields.push('unit = ?');
    values.push(data.unit);
  }
  if (data.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(data.is_active ? 1 : 0);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const [result] = await pool.execute(
    `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return (result as { affectedRows: number }).affectedRows > 0;
}

// Delete product (soft delete) + remove from inventory
export async function deleteProduct(id: number): Promise<boolean> {
  const [result] = await pool.execute(
    'UPDATE products SET is_active = FALSE WHERE id = ?',
    [id]
  );
  if ((result as { affectedRows: number }).affectedRows > 0) {
    // Also soft-delete inventory record so it disappears from stock page
    await pool.execute(
      'UPDATE inventory SET is_active = FALSE WHERE product_id = ?',
      [id]
    );
    return true;
  }
  return false;
}
