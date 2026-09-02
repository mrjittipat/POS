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
  categoryId?: number,
  includeInactive: boolean = false
): Promise<{ products: Product[]; total: number }> {
  const offset = (page - 1) * limit;
  // สินค้าที่ลบ (is_deleted=1) จะไม่แสดงทุกกรณี; includeInactive=true ให้เห็นของที่พักชั่วคราวด้วย (ในหน้าจัดการ)
  let whereClause = includeInactive
    ? 'WHERE p.is_deleted = FALSE'
    : 'WHERE p.is_deleted = FALSE AND p.is_active = TRUE';
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
  const [rows] = await pool.execute('SELECT * FROM products WHERE id = ? AND is_deleted = FALSE', [id]);
  const products = rows as Product[];
  return products.length > 0 ? products[0] : null;
}

// Get product by barcode
export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const [rows] = await pool.execute(
    'SELECT * FROM products WHERE barcode = ? AND is_active = TRUE AND is_deleted = FALSE',
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
  is_active?: boolean;
}): Promise<number> {
  // ตรวจสอบชื่อซ้ำ (เฉพาะสินค้าที่ยังอยู่ในตาราง products)
  const [nameCheck] = await pool.execute(
    'SELECT id FROM products WHERE name = ?',
    [data.name]
  );
  if ((nameCheck as any[]).length > 0) {
    throw new Error('ชื่อสินค้าซ้ำ');
  }

  // ตรวจสอบ SKU ซ้ำ (ถ้ามี)
  if (data.sku) {
    const [skuCheck] = await pool.execute(
      'SELECT id FROM products WHERE sku = ?',
      [data.sku]
    );
    if ((skuCheck as any[]).length > 0) {
      throw new Error('SKU ซ้ำ');
    }
  }

  // Auto-generate barcode if not provided
  const barcode = data.barcode || generateBarcode();

  // ตรวจสอบ barcode ซ้ำ
  const [barcodeCheck] = await pool.execute(
    'SELECT id FROM products WHERE barcode = ?',
    [barcode]
  );
  if ((barcodeCheck as any[]).length > 0) {
    throw new Error('บาร์โค้ดซ้ำ');
  }

  const [result] = await pool.execute(
    `INSERT INTO products (category_id, name, sku, barcode, image_url, price, cost, unit, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.category_id || null,
      data.name,
      data.sku || null,
      barcode,
      data.image_url || null,
      data.price,
      data.cost || 0,
      data.unit || 'ชิ้น',
      data.is_active === false ? 0 : 1,
    ]
  );

  const productId = (result as { insertId: number }).insertId;

  // บันทึกรูปภาพไว้ใน product_images (ถ้ามี)
  if (data.image_url) {
    await pool.execute(
      `INSERT INTO product_images (product_name, image_url)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE image_url = ?, updated_at = CURRENT_TIMESTAMP`,
      [data.name, data.image_url, data.image_url]
    );
  }

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
  // ตรวจสอบชื่อซ้ำ (ยกเว้นตัวเอง)
  if (data.name !== undefined) {
    const [nameCheck] = await pool.execute(
      'SELECT id FROM products WHERE name = ? AND id != ?',
      [data.name, id]
    );
    if ((nameCheck as any[]).length > 0) {
      throw new Error('ชื่อสินค้าซ้ำ');
    }
  }

  // ตรวจสอบ SKU ซ้ำ (ยกเว้นตัวเอง)
  if (data.sku !== undefined && data.sku) {
    const [skuCheck] = await pool.execute(
      'SELECT id FROM products WHERE sku = ? AND id != ?',
      [data.sku, id]
    );
    if ((skuCheck as any[]).length > 0) {
      throw new Error('SKU ซ้ำ');
    }
  }

  // ตรวจสอบ barcode ซ้ำ (ยกเว้นตัวเอง)
  if (data.barcode !== undefined && data.barcode) {
    const [barcodeCheck] = await pool.execute(
      'SELECT id FROM products WHERE barcode = ? AND id != ?',
      [data.barcode, id]
    );
    if ((barcodeCheck as any[]).length > 0) {
      throw new Error('บาร์โค้ดซ้ำ');
    }
  }

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

  // อัพเดทรูปภาพใน product_images (ถ้ามีการเปลี่ยน)
  if (data.image_url !== undefined && data.name !== undefined) {
    if (data.image_url) {
      await pool.execute(
        `INSERT INTO product_images (product_name, image_url)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE image_url = ?, updated_at = CURRENT_TIMESTAMP`,
        [data.name, data.image_url, data.image_url]
      );
    }
  } else if (data.image_url !== undefined && data.image_url) {
    // ถ้าเปลี่ยนแค่รูป ไม่ได้เปลี่ยนชื่อ ต้องดึงชื่อปัจจุบันมา
    const [rows] = await pool.execute('SELECT name FROM products WHERE id = ?', [id]);
    const product = (rows as { name: string }[])[0];
    if (product) {
      await pool.execute(
        `INSERT INTO product_images (product_name, image_url)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE image_url = ?, updated_at = CURRENT_TIMESTAMP`,
        [product.name, data.image_url, data.image_url]
      );
    }
  }

  return (result as { affectedRows: number }).affectedRows > 0;
}

// Delete product (archive to products_archived, then hard delete)
export async function deleteProduct(id: number, userId?: number): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. คัดลอกข้อมูลไปเก็บถาวร
    await connection.execute(
      `INSERT INTO products_archived (id, category_id, name, sku, barcode, image_url, price, cost, unit, is_active, created_at, updated_at, deleted_at, deleted_by)
       SELECT id, category_id, name, sku, barcode, image_url, price, cost, unit, is_active, created_at, updated_at, NOW(), ?
       FROM products WHERE id = ?`,
      [userId || null, id]
    );

    // 2. ลบออกจาก products จริงๆ
    const [result] = await connection.execute(
      'DELETE FROM products WHERE id = ?',
      [id]
    );

    // 3. ลบ inventory
    await connection.execute('DELETE FROM inventory WHERE product_id = ?', [id]);

    // 4. ส่ง product_id ที่ถูกลบกลับไปให้ frontend ทำความสะอาดพักบิล (ใน response)
    await connection.commit();
    return (result as { affectedRows: number }).affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// นำเข้าสินค้าจำนวนมาก — ตรวจเงื่อนไขแต่ละแถว แล้วเพิ่มเฉพาะแถวที่ผ่าน
export async function importProducts(
  rows: {
    name?: string;
    price?: number | string;
    cost?: number | string;
    unit?: string;
    sku?: string;
    barcode?: string;
    category?: string;
  }[]
): Promise<{ imported: number; skipped: { index: number; name: string; reason: string }[] }> {
  // ตรวจสอบซ้ำกับทั้ง products (สินค้าปัจจุบัน) และ products_archived (สินค้าที่ลบแล้ว)
  const [exRows] = await pool.execute('SELECT name, sku, barcode FROM products');
  const [archivedRows] = await pool.execute('SELECT name, sku, barcode FROM products_archived');

  const existing = exRows as { name: string; sku: string | null; barcode: string | null }[];
  const archived = archivedRows as { name: string; sku: string | null; barcode: string | null }[];

  const existingNames = new Set([
    ...existing.map((r) => r.name.trim()),
    ...archived.map((r) => r.name.trim())
  ]);
  const existingSkus = new Set([
    ...existing.map((r) => (r.sku || '').toLowerCase()),
    ...archived.map((r) => (r.sku || '').toLowerCase())
  ]);
  const existingBarcodes = new Set([
    ...existing.map((r) => (r.barcode || '').toLowerCase()),
    ...archived.map((r) => (r.barcode || '').toLowerCase())
  ]);

  // หมวดหมู่ → id
  const [catRows] = await pool.execute('SELECT id, name FROM categories');
  const catMap = new Map<string, number>((catRows as { id: number; name: string }[]).map((c) => [c.name.trim(), c.id]));

  const usedNames = new Set<string>();
  const usedSkus = new Set<string>();
  const usedBarcodes = new Set<string>();

  const skipped: { index: number; name: string; reason: string }[] = [];
  let imported = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineIndex = i + 2; // แถวที่ 1 คือ header

    const name = String(row.name ?? '').trim();
    const priceRaw = String(row.price ?? '').trim();
    const costRaw = String(row.cost ?? '').trim();
    const unit = String(row.unit ?? '').trim() || 'ชิ้น';
    const sku = String(row.sku ?? '').trim();
    const barcode = String(row.barcode ?? '').trim();
    const categoryName = String(row.category ?? '').trim();

    let reason = '';

    // เงื่อนไขตรวจสอบ
    if (!name) reason = 'ชื่อสินค้า (name) จำเป็น';
    else if (name.length > 200) reason = 'ชื่อสินค้ายาวเกิน 200 ตัวอักษร';
    else if (existingNames.has(name) || usedNames.has(name)) reason = 'ชื่อสินค้าซ้ำ (' + name + ')';

    if (!reason) {
      const price = Number(priceRaw);
      if (priceRaw === '' || !Number.isFinite(price) || price < 0) reason = 'ราคา (price) ต้องเป็นตัวเลข ≥ 0';
    }
    if (!reason) {
      const cost = costRaw === '' ? 0 : Number(costRaw);
      if (!Number.isFinite(cost) || cost < 0) reason = 'ต้นทุน (cost) ต้องเป็นตัวเลข ≥ 0';
    }
    if (!reason && sku) {
      if (sku.length > 50) reason = 'SKU ยาวเกิน 50 ตัวอักษร';
      else if (existingSkus.has(sku.toLowerCase()) || usedSkus.has(sku.toLowerCase())) reason = 'SKU ซ้ำ (' + sku + ')';
    }
    if (!reason && barcode) {
      if (barcode.length > 50) reason = 'บาร์โค้ดยาวเกิน 50 ตัวอักษร';
      else if (existingBarcodes.has(barcode.toLowerCase()) || usedBarcodes.has(barcode.toLowerCase())) reason = 'บาร์โค้ดซ้ำ (' + barcode + ')';
    }

    let categoryId: number | undefined;
    if (!reason && categoryName) {
      const id = catMap.get(categoryName);
      if (!id) reason = 'ไม่พบหมวดหมู่: ' + categoryName;
      else categoryId = id;
    }

    if (reason) {
      skipped.push({ index: lineIndex, name: name || '(ไม่มีชื่อ)', reason });
      continue;
    }

    try {
      // ดึงรูปภาพจาก product_images ถ้ามี (ชื่อสินค้าเดียวกัน)
      const [imageRows] = await pool.execute(
        'SELECT image_url FROM product_images WHERE product_name = ?',
        [name]
      );
      const savedImage = (imageRows as { image_url: string }[])[0];

      await createProduct({
        name,
        price: Number(priceRaw),
        cost: costRaw === '' ? 0 : Number(costRaw),
        unit,
        sku: sku || undefined,
        barcode: barcode || undefined,
        category_id: categoryId,
        image_url: savedImage?.image_url, // ใช้รูปเก่าถ้ามี
        is_active: true,
      });
      imported++;
      usedNames.add(name);
      if (sku) usedSkus.add(sku.toLowerCase());
      if (barcode) usedBarcodes.add(barcode.toLowerCase());
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      skipped.push({ index: lineIndex, name, reason: 'เกิดข้อผิดพลาด: ' + errMsg });
    }
  }

  return { imported, skipped };
}

// Get archived products
export async function getArchivedProducts(
  page: number = 1,
  limit: number = 20,
  search?: string
): Promise<{ products: Product[]; total: number }> {
  const offset = (page - 1) * limit;
  let whereClause = 'WHERE 1=1';
  const params: (string | number)[] = [];

  if (search) {
    whereClause += ' AND (pa.name LIKE ? OR pa.sku LIKE ? OR pa.barcode LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  const countParams = [...params];
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) as total FROM products_archived pa ${whereClause}`,
    countParams
  );
  const total = (countRows as { total: number }[])[0].total;

  const [rows] = await pool.execute(
    `SELECT pa.*, c.name as category_name
     FROM products_archived pa
     LEFT JOIN categories c ON pa.category_id = c.id
     ${whereClause}
     ORDER BY pa.deleted_at DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );

  return { products: rows as Product[], total };
}

// Restore product from archive
export async function restoreProduct(id: number): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. คัดลอกข้อมูลกลับไปที่ products
    const [result] = await connection.execute(
      `INSERT INTO products (id, category_id, name, sku, barcode, image_url, price, cost, unit, is_active, created_at, updated_at, is_deleted)
       SELECT id, category_id, name, sku, barcode, image_url, price, cost, unit, is_active, created_at, updated_at, FALSE
       FROM products_archived WHERE id = ?`,
      [id]
    );

    if ((result as { affectedRows: number }).affectedRows === 0) {
      await connection.rollback();
      return false;
    }

    // 2. สร้าง inventory record ใหม่
    await connection.execute(
      'INSERT INTO inventory (product_id, quantity, min_stock) VALUES (?, 0, 5)',
      [id]
    );

    // 3. ลบออกจาก archived
    await connection.execute('DELETE FROM products_archived WHERE id = ?', [id]);

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Permanently delete archived product
export async function permanentlyDeleteArchivedProduct(id: number): Promise<boolean> {
  const [result] = await pool.execute(
    'DELETE FROM products_archived WHERE id = ?',
    [id]
  );
  return (result as { affectedRows: number }).affectedRows > 0;
}
