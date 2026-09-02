-- Remove UNIQUE constraints from sku and barcode
-- เพื่อให้สามารถนำเข้าสินค้าที่ลบไปแล้วกลับมาได้
-- (ใช้ application-level validation เช็คซ้ำกับสินค้าที่ is_active = 1 แทน)

ALTER TABLE products DROP INDEX sku;
ALTER TABLE products DROP INDEX barcode;

-- สร้าง index ใหม่แบบไม่ unique
ALTER TABLE products ADD INDEX idx_sku_lookup (sku);
ALTER TABLE products ADD INDEX idx_barcode_lookup (barcode);
