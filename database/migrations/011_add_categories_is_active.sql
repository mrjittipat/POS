-- 011_add_categories_is_active.sql
-- เพิ่ม column is_active สำหรับ เปิดใช้งาน / พักสินค้าชั่วคราว (soft status) ของหมวดหมู่

ALTER TABLE categories
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER description;
