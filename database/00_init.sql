-- 00_init.sql
-- Combined database initialization script for Docker
-- This file runs all migrations and seeds in order

-- ============================================
-- MIGRATIONS
-- ============================================

-- 001_create_users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'manager', 'cashier') NOT NULL DEFAULT 'cashier',
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 002_create_categories
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 003_create_products
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) UNIQUE,
    barcode VARCHAR(50) UNIQUE,
    image_url VARCHAR(500),
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(50) DEFAULT 'ชิ้น',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_category (category_id),
    INDEX idx_sku (sku),
    INDEX idx_barcode (barcode),
    INDEX idx_name (name),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 004_create_inventory
CREATE TABLE IF NOT EXISTS inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL UNIQUE,
    quantity INT NOT NULL DEFAULT 0,
    min_stock INT NOT NULL DEFAULT 5,
    location VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product (product_id),
    INDEX idx_quantity (quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 005_create_transactions
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_code VARCHAR(50) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount_type ENUM('percent', 'fixed') DEFAULT 'fixed',
    vat_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    vat_rate DECIMAL(5, 2) NOT NULL DEFAULT 7.00,
    net_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status ENUM('completed', 'cancelled', 'refunded') NOT NULL DEFAULT 'completed',
    cancel_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_transaction_code (transaction_code),
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 006_create_transaction_items
CREATE TABLE IF NOT EXISTS transaction_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    barcode VARCHAR(50),
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_transaction (transaction_id),
    INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 007_create_payments
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    method ENUM('cash', 'promptpay', 'transfer', 'credit_card') NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    reference VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    INDEX idx_transaction (transaction_id),
    INDEX idx_method (method)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 008_create_inventory_logs
CREATE TABLE IF NOT EXISTS inventory_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    type ENUM('in', 'out', 'adjustment') NOT NULL,
    quantity INT NOT NULL,
    before_qty INT NOT NULL,
    after_qty INT NOT NULL,
    reason VARCHAR(255),
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_product (product_id),
    INDEX idx_type (type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 009_create_settings
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(100) NOT NULL UNIQUE,
    `value` TEXT,
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SEEDS
-- ============================================

-- Default admin user (password: admin123)
INSERT INTO users (username, password, full_name, role, phone, is_active)
VALUES (
    'admin',
    '$2b$10$2tpGlYE0vpV4lWzyWrH8r.B0ST1uwfMj/uf2w0cD0gzgM5F5kRQwa',
    'ผู้ดูแลระบบ',
    'admin',
    '0812345678',
    TRUE
);

-- Sample categories
INSERT INTO categories (name, description) VALUES
('เครื่องดื่ม', 'เครื่องดื่มทุกชนิด'),
('ขนม/สนุกเกอร์', 'ขนมขบเคี้ยว สนุกเกอร์ ชิปส์'),
('อาหารสำเร็จรูป', 'อาหารกระป๋อง บะหมี่กึ่สำเร็จรูป'),
('ของใช้ในครัวเรือน', 'สบู่ ยาสระผม ผ้าอ้อม'),
('ผลิตภัณฑ์นม', 'นม โยเกิร์ต เนย ชีส'),
('เครื่องเขียน', 'ดินสอ ปากกา สมุด'),
('ยาสามัญ', 'ยาสามัญประจำบ้าน'),
('อื่นๆ', 'สินค้าทั่วไป');

-- Sample products
INSERT INTO products (category_id, name, sku, barcode, price, cost, unit) VALUES
(1, 'น้ำดื่มสิงห์ 600ml', 'BEV-001', '8850999320016', 10.00, 6.00, 'ขวด'),
(1, 'โค้ก 1.25L', 'BEV-002', '5449000000996', 45.00, 32.00, 'ขวด'),
(1, 'เป๊ปซี่ 1.25L', 'BEV-003', '8851952321019', 45.00, 32.00, 'ขวด'),
(1, 'น้ำแร่ภูเขาไฟ 750ml', 'BEV-004', '8851959010015', 15.00, 9.00, 'ขวด'),
(1, 'กาแฟเอสเปรสโซ สำเร็จรูป', 'BEV-005', '8850393111111', 25.00, 15.00, 'ซอง'),
(2, 'โดโสะ รสดั้งเดิม 75g', 'SNK-001', '8851019010011', 20.00, 14.00, 'ซอง'),
(2, 'เลย์สแตมป์ รสเนยเค็ม 69g', 'SNK-002', '8850124001616', 35.00, 25.00, 'ซอง'),
(2, 'โอริโอ ครีมวนิลา 36g', 'SNK-003', '8850019010012', 10.00, 6.00, 'แผง'),
(2, 'ชิ๊ตโต สไปซี่ 78g', 'SNK-004', '8850124002224', 25.00, 18.00, 'ซอง'),
(3, 'มาม่ารสต้มยำกุ้ง 60g', 'FDS-001', '8850999010017', 7.00, 4.50, 'ซอง'),
(3, 'คนอร์ซุปกระป๋อง สไตล์ไทย 298ml', 'FDS-002', '7622210951258', 32.00, 22.00, 'กระป๋อง'),
(3, 'ปลากระป๋อง สาคู 185g', 'FDS-003', '8850999020016', 25.00, 17.00, 'กระป๋อง'),
(4, 'สบู่ซันไลต์ 130g', 'HOU-001', '8850007010011', 25.00, 16.00, 'ก้อน'),
(4, 'ยาสระผมเจลอโพร์ 340ml', 'HOU-002', '8850007020010', 120.00, 80.00, 'ขวด'),
(4, 'ผ้าขนหนูเปียก 100 แผ่น', 'HOU-003', '8850007030019', 45.00, 30.00, 'ถุง'),
(5, 'นมโฟร์โมสต UHT 200ml', 'MLK-001', '8850999030015', 12.00, 8.00, 'กล่อง'),
(5, 'โยเกิร์ตโชกุบุก 400g', 'MLK-002', '8850999040014', 35.00, 24.00, 'ถ้วย');

-- Create initial inventory
INSERT INTO inventory (product_id, quantity, min_stock)
SELECT id, 100, 10 FROM products;

-- Default settings
INSERT INTO settings (`key`, `value`, description) VALUES
('store_name', 'ร้านค้า POS System', 'ชื่อร้านค้า'),
('store_address', '123 ถนนสุขุมวิท กรุงเทพฯ 10110', 'ที่อยู่ร้านค้า'),
('store_phone', '02-123-4567', 'เบอร์โทรศัพท์'),
('tax_id', '0123456789012', 'เลขประจำตัวผู้เสียภาษี'),
('vat_rate', '7', 'อัตราภาษีมูลค่าเพิ่ม (%)'),
('receipt_footer', 'ขอบคุณที่ใช้บริการ', 'ข้อความท้ายใบเสร็จ'),
('currency', 'THB', 'สกุลเงิน'),
('timezone', 'Asia/Bangkok', 'เขตเวลา');
