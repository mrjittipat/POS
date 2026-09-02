import pool from '../config/database';
import { Inventory, InventoryLog } from '../models/types';

/**
 * Inventory Service
 * จัดการสต๊อกสินค้า
 */

// Get all inventory with product info
export async function getInventory(
  page: number = 1,
  limit: number = 20,
  lowStock?: boolean
): Promise<
  {
    items: (Inventory & { product_name: string; sku: string | null })[];
    total: number;
  }
> {
  const offset = (page - 1) * limit;
  let whereClause = 'p.is_deleted = FALSE';
  const params: (string | number)[] = [];

  if (lowStock) {
    whereClause += ' AND i.quantity <= i.min_stock';
  }

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) as total FROM inventory i
     JOIN products p ON i.product_id = p.id
     WHERE ${whereClause}`,
    params
  );
  const total = (countRows as { total: number }[])[0].total;

  const [rows] = await pool.execute(
    `SELECT i.*, p.name as product_name, p.sku
     FROM inventory i
     JOIN products p ON i.product_id = p.id
     WHERE ${whereClause}
     ORDER BY i.quantity ASC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );

  return { items: rows as (Inventory & { product_name: string; sku: string | null })[], total };
}

// Get low stock items
export async function getLowStock(): Promise<
  (Inventory & { product_name: string; sku: string | null })[]
> {
  const [rows] = await pool.execute(
    `SELECT i.*, p.name as product_name, p.sku
     FROM inventory i
     JOIN products p ON i.product_id = p.id
     WHERE i.quantity <= i.min_stock AND p.is_active = TRUE AND p.is_deleted = FALSE
     ORDER BY i.quantity ASC`
  );
  return rows as (Inventory & { product_name: string; sku: string | null })[];
}

// Adjust stock
export async function adjustStock(
  productId: number,
  quantity: number,
  type: 'in' | 'out' | 'adjustment',
  reason: string,
  userId: number
): Promise<boolean> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Get current quantity
    const [rows] = await connection.execute(
      'SELECT quantity FROM inventory WHERE product_id = ? FOR UPDATE',
      [productId]
    );
    const items = rows as { quantity: number }[];

    if (items.length === 0) {
      await connection.rollback();
      return false;
    }

    const beforeQty = items[0].quantity;
    let afterQty: number;

    if (type === 'in') {
      afterQty = beforeQty + quantity;
    } else if (type === 'out') {
      afterQty = beforeQty - quantity;
      if (afterQty < 0) afterQty = 0;
    } else {
      afterQty = quantity; // adjustment sets absolute value
    }

    // Update inventory
    await connection.execute(
      'UPDATE inventory SET quantity = ? WHERE product_id = ?',
      [afterQty, productId]
    );

    // Log the change
    await connection.execute(
      `INSERT INTO inventory_logs (product_id, type, quantity, before_qty, after_qty, reason, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [productId, type, quantity, beforeQty, afterQty, reason, userId]
    );

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Get inventory logs
export async function getInventoryLogs(
  productId?: number,
  page: number = 1,
  limit: number = 50
): Promise<{ logs: (InventoryLog & { product_name: string })[]; total: number }> {
  const offset = (page - 1) * limit;
  let whereClause = '';
  const params: (number)[] = [];

  if (productId) {
    whereClause = 'WHERE l.product_id = ?';
    params.push(productId);
  }

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) as total FROM inventory_logs l ${whereClause}`,
    params
  );
  const total = (countRows as { total: number }[])[0].total;

  const [rows] = await pool.execute(
    `SELECT l.*, p.name as product_name
     FROM inventory_logs l
     JOIN products p ON l.product_id = p.id
     ${whereClause}
     ORDER BY l.created_at DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );

  return { logs: rows as (InventoryLog & { product_name: string })[], total };
}

// Update minimum stock (จำนวนขั้นต่ำ) for a product
export async function updateMinStock(productId: number, minStock: number): Promise<boolean> {
  const [result] = await pool.execute(
    'UPDATE inventory SET min_stock = ? WHERE product_id = ?',
    [minStock, productId]
  );
  return (result as { affectedRows: number }).affectedRows > 0;
}
