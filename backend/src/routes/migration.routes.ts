import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

router.post('/fix-unique-constraints', async (req: Request, res: Response) => {
  try {
    // ลบ UNIQUE constraint จาก sku และ barcode
    await pool.execute('ALTER TABLE products DROP INDEX IF EXISTS sku');
    await pool.execute('ALTER TABLE products DROP INDEX IF EXISTS barcode');

    // สร้าง index ใหม่แบบ NON-UNIQUE
    await pool.execute('CREATE INDEX IF NOT EXISTS idx_sku_lookup ON products (sku)');
    await pool.execute('CREATE INDEX IF NOT EXISTS idx_barcode_lookup ON products (barcode)');

    // ตรวจสอบผลลัพธ์
    const [indexes] = await pool.execute(`
      SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = 'pos_system'
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME IN ('sku', 'barcode')
      ORDER BY COLUMN_NAME, INDEX_NAME
    `);

    res.json({ success: true, message: 'Migration completed successfully', indexes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/create-archived-table', async (req: Request, res: Response) => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS products_archived (
        id INT PRIMARY KEY,
        category_id INT,
        name VARCHAR(200) NOT NULL,
        sku VARCHAR(50),
        barcode VARCHAR(50),
        image_url VARCHAR(500),
        price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        unit VARCHAR(50) DEFAULT 'ชิ้น',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_by INT,
        INDEX idx_name (name),
        INDEX idx_deleted_at (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    res.json({ success: true, message: 'products_archived table created successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/archive-inactive-products', async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // นับสินค้าที่จะย้าย
    const [countResult] = await connection.execute(
      'SELECT COUNT(*) as total FROM products WHERE is_active = FALSE'
    );
    const total = (countResult as { total: number }[])[0].total;

    if (total === 0) {
      await connection.rollback();
      return res.json({ success: true, message: 'No inactive products to archive', archived: 0 });
    }

    // คัดลอกสินค้าที่ is_active = 0 ไปยัง products_archived
    await connection.execute(`
      INSERT INTO products_archived (id, category_id, name, sku, barcode, image_url, price, cost, unit, is_active, created_at, updated_at, deleted_at, deleted_by)
      SELECT id, category_id, name, sku, barcode, image_url, price, cost, unit, is_active, created_at, updated_at, NOW(), NULL
      FROM products WHERE is_active = FALSE
    `);

    // ลบ inventory ของสินค้าเหล่านี้
    await connection.execute('DELETE FROM inventory WHERE product_id IN (SELECT id FROM products WHERE is_active = FALSE)');

    // ลบสินค้าออกจาก products
    await connection.execute('DELETE FROM products WHERE is_active = FALSE');

    await connection.commit();
    res.json({ success: true, message: `Archived ${total} inactive products successfully`, archived: total });
  } catch (error: any) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

router.post('/create-product-images-table', async (req: Request, res: Response) => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS product_images (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_name VARCHAR(200) NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY idx_product_name (product_name),
        INDEX idx_image_url (image_url)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    res.json({ success: true, message: 'product_images table created successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
