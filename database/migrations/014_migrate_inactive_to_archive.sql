-- ย้ายสินค้าที่ is_active = 0 ทั้งหมดไป products_archived
INSERT INTO products_archived (id, category_id, name, sku, barcode, image_url, price, cost, unit, is_active, created_at, updated_at, deleted_at, deleted_by)
SELECT id, category_id, name, sku, barcode, image_url, price, cost, unit, is_active, created_at, updated_at, NOW(), NULL
FROM products
WHERE is_active = 0;

-- ลบสินค้าที่ is_active = 0 ออกจาก products
DELETE FROM products WHERE is_active = 0;

-- ลบ inventory ของสินค้าที่ไม่มีใน products แล้ว
DELETE FROM inventory WHERE product_id NOT IN (SELECT id FROM products);
