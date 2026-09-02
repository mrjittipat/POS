# POS System - โครงสร้างโปรเจค

## ภาพโดยรวม
POS (Point of Sale) สำหรับร้านค้าปลีกไทย รองรับการขายหน้าร้าน จัดการสินค้า/คลังสินค้า รายงาน และแจ้งเตือน

## เทคโนโลยี
- **Frontend**: React 18, TypeScript, Vite 5, Tailwind CSS 3, Zustand, React Router v6, Axios, Recharts, Lucide React
- **Backend**: Node.js 20, Express.js 4, TypeScript, mysql2 (raw SQL ไม่ใช้ ORM)
- **Database**: MySQL 8.0 (utf8mb4, timezone +07:00)
- **Auth**: JWT (access 15m + refresh 7d), bcryptjs 12 rounds
- **Deploy**: Docker Compose (3 services: mysql, backend, frontend+nginx), phpMyAdmin (dev profile)

## Directory Structure
```
pos-system/
├── backend/
│   ├── src/
│   │   ├── index.ts / app.ts     ← entry point + Express setup
│   │   ├── config/               ← database.ts (mysql2 pool), env.ts, swagger.ts
│   │   ├── middleware/           ← auth.middleware.ts, role.middleware.ts, upload.middleware.ts, validation.middleware.ts, error.middleware.ts
│   │   ├── routes/               ← *.routes.ts mount ที่ /api
│   │   ├── controllers/          ← thin, เรียก service
│   │   ├── services/             ← business logic + raw SQL
│   │   ├── models/types.ts       ← TypeScript interfaces
│   │   ├── utils/                ← jwt.util.ts, password.util.ts, barcode.util.ts, receipt.util.ts
│   │   └── scripts/              ← migrate.ts, seed.ts
│   └── Dockerfile                ← multi-stage: node build → node-alpine prod
├── frontend/
│   ├── src/
│   │   ├── main.tsx / App.tsx    ← entry + React Router (BrowserRouter)
│   │   ├── api/                  ← *.api.ts แต่ละ domain (auth, products, pos, reports, dashboard, inventory, categories)
│   │   │   └── axios.ts          ← shared instance, base URL ผ่าน nginx proxy
│   │   ├── store/                ← Zustand: auth (useAuthstore.ts), notifications (useNotificationStore.ts)
│   │   ├── context/              ← DialogContext.tsx (toast/confirm/alert)
│   │   ├── components/
│   │   │   ├── layout/           ← MainLayout.tsx (Sidebar+Header+Outlet), Sidebar.tsx, Header.tsx (notification bell)
│   │   │   ├── pos/              ← ProductGrid.tsx (category pill filter), CartSummary.tsx
│   │   │   └── dialog/           ← ConfirmDialog, AlertDialog, Toast
│   │   ├── pages/                ← Login, Dashboard, POS, Products, Categories, Inventory, Reports, Users, Settings
│   │   └── utils/                ← format.ts (currency/date th-TH), constants.ts (ROLE_NAMES)
│   ├── nginx.conf                ← SPA fallback, API proxy → backend:3000
│   └── Dockerfile                ← multi-stage: node build → nginx-alpine
└── database/
    ├── 00_init.sql               ← init script สำหรับ Docker (tables + seeds)
    └── migrations/*.sql          ← 001-009
```

## API Endpoints (ทั้งหมด prefix `/api`)
| Route | Methods | Auth |
|-------|---------|------|
| `/auth` | login, logout, refresh, me, change-password | public/login required |
| `/users` | CRUD, reset-password | admin only |
| `/categories` | CRUD | admin/manager (R: all) |
| `/products` | CRUD + image upload, search, filter category | admin/manager (R: all) |
| `/inventory` | list, low-stock, adjust, logs | admin/manager (R: all) |
| `/pos` | checkout, transactions, **today-sold-items** | login required |
| `/reports` | sales, products, profit-loss, inventory | admin/manager/cashier |
| `/dashboard` | stats, charts, sales-summary | login required |
| `/barcode` | generate, validate | admin/manager |
| `/health` | health check | public |

## Database Tables (9 tables + `_migrations`)
| Table | สำคัญ |
|-------|-------|
| `users` | admin/manager/cashier, bcrypt password, is_active soft-delete |
| `categories` | name, description |
| `products` | FK→category, SKU, barcode, image_url, price, cost, unit, is_active |
| `inventory` | 1:1 product, quantity, min_stock, location (**ไม่มี is_active**) |
| `transactions` | TXN code, user_id, total/net/vat/discount, status (completed/cancelled/refunded) |
| `transaction_items` | snapshot product_name+price ตอนขาย |
| `payments` | cash/promptpay/transfer/credit_card, amount, reference |
| `inventory_logs` | in/out/adjustment, before/after qty |
| `settings` | key-value: store_name, vat_rate(7%), currency(THB) |

## ข้อควรรู้สำคัญ
- **inventory ไม่มีคอลัมน์ `is_active`** — ถ้า query inventory ห้ามใส่ `i.is_active`
- **เวลา**: ใช้ `CURDATE()` ใน SQL แทน `new Date().toISOString()` (timezone +07:00)
- **ราคา**: `DECIMAL(10,2)`, คำนวณฝั่ง backend
- **Transaction checkout**: ใช้ MySQL transaction (BEGIN/COMMIT/ROLLBACK) ตัดสต็อก atomic
- **Soft delete**: users, products ใช้ flag `is_active`
- **Pagination**: 10 รายการ/หน้า, ใส่ empty rows เติมให้ความสูงคงที่
- **Notification bell**: ดึง `/api/pos/today-sold-items` → แสดงสินค้าที่ขายวันนี้ + จุดแดง + ล้างได้
- **JWT secret**: `.env` → `JWT_SECRET`, `JWT_REFRESH_SECRET`
- **Default user**: admin / admin123 (seed จาก database/00_init.sql)

## Docker
> ⚠️ ทุกคำสั่ง docker-compose ต้องใส่ `--env-file .env.docker` **ไม่งั้นจะใช้ `.env` (DB_HOST=127.0.0.1)** ซึ่ง backend ใน container เชื่อม MySQL ไม่ได้ (ต้องใช้ host `mysql`)

```bash
docker-compose --env-file .env.docker up --build   # rebuild + start all
docker-compose --env-file .env.docker up -d        # start existing
docker-compose --env-file .env.docker down         # stop
```
- Frontend: port 80, Backend: port 3000, MySQL: port 3306
- phpMyAdmin: port 8080 (dev profile: `docker-compose --env-file .env.docker --profile dev up -d`)
- `.env` เก็บค่า dev local (XAMPP, DB_HOST=127.0.0.1) — อย่าใช้กับ Docker

## แก้ไขโค้ดแล้วต้อง
```bash
docker-compose --env-file .env.docker build --no-cache backend frontend
docker-compose --env-file .env.docker up -d --force-recreate backend frontend
```
เพราะ Docker cache ถ้าไม่ใส่ `--no-cache` จะยังใช้ build เก่า
