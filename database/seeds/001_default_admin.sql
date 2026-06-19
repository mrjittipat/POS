-- 001_default_admin.sql
-- สร้างผู้ดูแลระบบเริ่มต้น
-- รหัสผ่าน: admin123 (bcrypt hash)

INSERT INTO users (username, password, full_name, role, phone, is_active)
VALUES (
    'admin',
    '$2b$10$2tpGlYE0vpV4lWzyWrH8r.B0ST1uwfMj/uf2w0cD0gzgM5F5kRQwa',
    'ผู้ดูแลระบบ',
    'admin',
    '0812345678',
    TRUE
);
