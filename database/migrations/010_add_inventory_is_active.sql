-- 010_add_inventory_is_active.sql
-- เพิ่ม column is_active สำหรับ soft delete สต๊อกสินค้า

ALTER TABLE inventory
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER quantity;

-- เพิ่ม index สำหรับกรองสินค้าที่ยัง active
ALTER TABLE inventory
  ADD INDEX idx_active (is_active);
