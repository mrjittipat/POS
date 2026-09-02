# 🏪 POS System - ระบบขายหน้าร้าน

ระบบ Point of Sale (POS) สำหรับร้านค้าปลีกไทย รองรับการขายหน้าร้าน จัดการสต๊อก รายงานยอดขาย และแจ้งเตือน

## 📋 คุณสมบัติ

- 🔐 **ระบบผู้ใช้งาน** - Login, Logout, จัดการสิทธิ์ (Admin, Manager, Cashier)
- 👤 **โปรไฟล์ผู้ใช้** - คลิกโปรไฟล์ขวาบน → เมนูตั้งค่าโปรไฟล์ (แก้ชื่อ/เบอร์ + เปลี่ยนรหัสผ่าน)
- 📦 **จัดการสินค้า** - เพิ่ม/แก้ไข/ลบ สินค้า, หมวดหมู่, SKU, Barcode, อัพโหลดรูป
- 📊 **จัดการสต๊อก** - รับเข้า/ตัดออก/ปรับยอด, แจ้งเตือนสินค้าใกล้หมด
- 🛒 **หน้าจอขาย (POS)** - เลือกสินค้า, ตะกร้า, ส่วนลด, VAT, ชำระเงิน
- 💳 **ชำระเงิน** - เงินสด, QR PromptPay, โอนเงิน, บัตรเครดิต
- 🔔 **แจ้งเตือน** - กระดิ่งแสดงสินค้าที่ขายวันนี้ + จุดแดง + ล้างได้
- 📈 **รายงาน** - ยอดขาย, สินค้าขายดี, กำไรขาดทุน (admin/manager/cashier เข้าได้)
- 📊 **แดชบอร์ด** - ยอดขายวันนี้, กราฟ, สินค้าขายดี (auto-refresh หลังขาย)

## 🛠️ เทคโนโลยี

| ส่วน | เทคโนโลยี |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite 5 + Tailwind CSS 3 |
| Backend | Node.js 20 + Express.js 4 + TypeScript |
| Database | MySQL 8.0 (utf8mb4, timezone +07:00) |
| Auth | JWT (Access 15m + Refresh 7d), bcryptjs |
| State | Zustand |
| Charts | Recharts |
| Deploy | Docker Compose + Nginx |

## 🚀 การติดตั้น (Clone มาให้ทำงาน)

### ขั้นตอนที่ 1: Clone
```bash
git clone <repository-url>
cd pos-system
```

### ขั้นตอนที่ 2: สร้างไฟล์ env
- **รันด้วย Docker:** ใช้ไฟล์ `.env.docker` ที่มีอยู่แล้ว (ค่า default ใช้ได้ทันที) โดย clone จาก example:
  ```bash
  cp .env.example .env.docker
  # แล้วแก้ DB_HOST=mysql (ชี้ไปที่ container ของ MySQL)
  ```
  > ⚠️ **สำคัญ:** ตอนรัน Docker **ห้ามใช้ `.env` ตัวเดียวกับ dev local** เพราะ `.env` มี `DB_HOST=127.0.0.1` ซึ่งจะทำให้ backend ใน container เชื่อมต่อ MySQL ไม่ได้
- **รัน local (XAMPP):** ใช้ `.env` ปกติที่มี `DB_HOST=127.0.0.1`

### ขั้นตอนที่ 3: Build + Run
```bash
docker-compose --env-file .env.docker up -d --build
```
> ⚠️ **สำคัญ:** ทุกครั้งที่แก้โค้ดแล้ว rebuild ต้องใช้ `--no-cache` เสมอ เพราะ Docker cache จะทำให้ใช้ build เก่า
> ```bash
> docker-compose --env-file .env.docker build --no-cache backend frontend
> docker-compose --env-file .env.docker up -d --force-recreate backend frontend
> ```

### ขั้นตอนที่ 4: เข้าใช้งาน
| Service | URL |
|---------|-----|
| 🌐 Frontend | http://localhost |
| 🔌 Backend API | http://localhost:3000 |
| 📚 Swagger Docs | http://localhost:3000/api-docs |
| 🗄️ phpMyAdmin | http://localhost:8080 (dev only) |

### ข้อมูลเข้าสู่ระบบ
```
Username: admin
Password: admin123
```

## 📁 โครงสร้างโปรเจกต์
```
pos-system/
├── CLAUDE.md                   ← 📌 อ่านไฟล์นี้ก่อน! (สำหรับ AI)
├── docker-compose.yml
├── .env.example
├── README.md
├── backend/
│   ├── src/
│   │   ├── index.ts / app.ts   ← Entry + Express setup
│   │   ├── config/             ← database.ts, env.ts, swagger.ts
│   │   ├── middleware/         ← auth, role, upload, validation, error
│   │   ├── routes/             ← API routes (mount ที่ /api)
│   │   ├── controllers/        ← Request handlers (thin)
│   │   ├── services/           ← Business logic + raw SQL
│   │   ├── models/types.ts     ← TypeScript interfaces
│   │   ├── utils/              ← jwt, password, barcode, receipt
│   │   └── scripts/            ← migrate.ts, seed.ts
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx / App.tsx  ← Entry + Router
│   │   ├── api/                ← auth, products, pos, reports, dashboard, inventory, categories
│   │   │   └── axios.ts        ← Shared instance
│   │   ├── store/              ← auth (Zustand), notifications (Zustand)
│   │   ├── context/            ← DialogContext (toast/confirm)
│   │   ├── components/
│   │   │   ├── layout/         ← MainLayout, Sidebar, Header (notification bell)
│   │   │   ├── pos/            ← ProductGrid, CartSummary
│   │   │   └── dialog/         ← ConfirmDialog, AlertDialog, Toast
│   │   ├── pages/              ← Login, Dashboard, POS, Products, Categories, Inventory, Reports, Users, Settings
│   │   └── utils/              ← format.ts (currency/date th-TH), constants.ts
│   ├── nginx.conf
│   └── Dockerfile
└── database/
    ├── 00_init.sql             ← Init script (tables + seeds)
    └── migrations/*.sql        ← 001-009
```

## 🗄️ Database Tables (9 tables)
| Table | หมายเหตุ |
|-------|---------|
| `users` | admin/manager/cashier, bcrypt, is_active |
| `categories` | name, description |
| `products` | FK→category, SKU, barcode, image_url, price, cost, unit, is_active |
| `inventory` | 1:1 product, quantity, min_stock, location (**⚠️ ไม่มี is_active**) |
| `transactions` | TXN code, status (completed/cancelled/refunded) |
| `transaction_items` | snapshot product_name+price ตอนขาย |
| `payments` | cash/promptpay/transfer/credit_card |
| `inventory_logs` | in/out/adjustment audit trail |
| `settings` | key-value config |

## 📌 ข้อควรรู้สำคัญ
- **inventory ไม่มี `is_active`** — query ห้ามใส่ `i.is_active = TRUE`
- **เวลา** — ใช้ `CURDATE()` ใน SQL แทน JS `toISOString()` (timezone +07:00)
- **ราคา** — `DECIMAL(10,2)`, คำนวณฝั่ง backend
- **Checkout** — MySQL transaction (BEGIN/COMMIT/ROLLBACK) ตัดสต็อก atomic
- **Pagination** — 10 รายการ/หน้า, เติม empty rows ให้ความสูงคงที่
- **Docker cache** — แก้โค้ดแล้วต้อง `build --no-cache` ไม่งั้นใช้ build เก่า

## 🔧 คำสั่ง Docker ที่ใช้บ่อย
> ทุกคำสั่ง docker-compose ต้องใส่ `--env-file .env.docker` เสมอ ไม่งั้นจะใช้ `.env` (DB_HOST=127.0.0.1) ที่ backend ใน container เชื่อม MySQL ไม่ได้

```bash
# เริ่มทุก service
docker-compose --env-file .env.docker up -d

# เริ่มพร้อม phpMyAdmin
docker-compose --env-file .env.docker --profile dev up -d

# Rebuild หลังแก้โค้ด (สำคัญ!)
docker-compose --env-file .env.docker build --no-cache backend frontend
docker-compose --env-file .env.docker up -d --force-recreate backend frontend

# ดู logs
docker-compose logs -f backend
docker-compose logs -f frontend

# หยุด
docker-compose --env-file .env.docker down

# หยุด + ลบข้อมูล (ระวัง!)
docker-compose --env-file .env.docker down -v

# เข้า container
docker exec -it pos-backend sh
docker exec -it pos-mysql mysql -u root -prootpassword pos_system
```

## 📄 License
MIT License
