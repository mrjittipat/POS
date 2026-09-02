-- 012_add_products_is_deleted.sql
-- แยกสินค้า "ที่ลบแล้ว" ออกจาก "พักชั่วคราว" (is_active=0)
-- สินค้าที่ is_deleted=1 จะไม่แสดงในทุกหน้า

ALTER TABLE products
  ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE AFTER is_active,
  ADD INDEX idx_deleted (is_deleted);
