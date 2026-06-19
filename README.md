# 🏪 POS System - ระบบขายหน้าร้าน

ระบบ Point of Sale (POS) สำหรับร้านค้าแบบ Full System รองรับการขายหน้าร้าน จัดการสต๊อก รายงานยอดขาย และอื่นๆ

## 📋 คุณสมบัติ

- 🔐 **ระบบผู้ใช้งาน** - Login, Logout, จัดการสิทธิ์ (Admin, Manager, Cashier)
- 📦 **จัดการสินค้า** - เพิ่ม/แก้ไข/ลบ สินค้า, หมวดหมู่, SKU, Barcode
- 📊 **จัดการสต๊อก** - รับเข้า/ตัดออก/ปรับยอด, แจ้งเตือนสินค้าใกล้หมด
- 🛒 **หน้าจอขาย (POS)** - เลือกสินค้า, ตะกร้า, ส่วนลด, VAT
- 💳 **ชำระเงิน** - เงินสด, QR PromptPay, โอนเงิน, บัตรเครดิต
- 🧾 **ใบเสร็จ** - พิมพ์ใบเสร็จ, ดาวน์โหลด PDF
- 📈 **รายงาน** - ยอดขาย, สินค้าขายดี, กำไรขาดทุน
- 📊 **แดชบอร์ด** - ยอดขายวันนี้, กราฟ, สินค้าขายดี
- 🔍 **สแกนบาร์โค้ด** - ค้นหาสินค้าจากบาร์โค้ด

## 🛠️ เทคโนโลยี

| ส่วน | เทคโนโลยี |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express.js + TypeScript |
| Database | MySQL 8.0 |
| Auth | JWT (Access + Refresh Tokens) |
| Charts | Recharts |
| State | Zustand |
| HTTP | Axios |
| Docs | Swagger/OpenAPI 3.0 |
| Deploy | Docker + Docker Compose |

## 🚀 การติดตั้ง

### วิธีที่ 1: ใช้ Docker (แนะนำ)

#### ขั้นตอนที่ 1: Clone โปรเจกต์
```bash
git clone <repository-url>
cd pos-system
```

#### ขั้นตอนที่ 2: ตั้งค่า Environment
```bash
cp .env.example .env
# แก้ไขไฟล์ .env ตามต้องการ
```

#### ขั้นตอนที่ 3: Build และ Run
```bash
docker-compose up -d --build
```

#### ขั้นตอนที่ 4: เข้าใช้งาน
- 🌐 Frontend: http://localhost
- 🔌 Backend API: http://localhost:3000
- 📚 API Docs: http://localhost:3000/api-docs
- 🗄️ phpMyAdmin: http://localhost:8080 (รันด้วย `docker-compose --profile dev up -d`)

#### ข้อมูลเข้าสู่ระบบเริ่มต้น
```
Username: admin
Password: admin123
```

### วิธีที่ 2: รันแยก (Development)

#### Backend
```bash
cd backend
npm install
cp ../.env.example .env
npm run migrate
npm run seed
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### MySQL
- ติดตั้ง MySQL 8.0+
- สร้างฐานข้อมูล `pos_system`
- รัน migration files ใน `database/migrations/`
- รัน seed files ใน `database/seeds/`

## 📁 โครงสร้างโปรเจกต์

```
pos-system/
├── docker-compose.yml          # Docker Compose configuration
├── .env.example                # Environment template
├── README.md                   # เอกสารนี้
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts            # Entry point
│       ├── app.ts              # Express app setup
│       ├── config/             # Configuration
│       ├── middleware/          # Express middleware
│       ├── routes/             # API routes
│       ├── controllers/        # Request handlers
│       ├── services/           # Business logic
│       ├── models/             # TypeScript types
│       ├── utils/              # Utility functions
│       └── scripts/            # Migration & seed scripts
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── main.tsx            # React entry
│       ├── App.tsx             # Router
│       ├── api/                # API clients
│       ├── components/         # React components
│       │   ├── common/         # Shared components
│       │   ├── layout/         # Layout components
│       │   ├── pos/            # POS-specific
│       │   ├── products/       # Product management
│       │   ├── inventory/      # Inventory management
│       │   └── reports/        # Report components
│       ├── pages/              # Page components
│       ├── hooks/              # Custom hooks
│       ├── context/            # React context
│       ├── store/              # Zustand store
│       └── utils/              # Utilities
│
└── database/
    ├── migrations/             # SQL migration files
    └── seeds/                  # Seed data
```

## 📚 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | เข้าสู่ระบบ |
| POST | /api/auth/logout | ออกจากระบบ |
| POST | /api/auth/refresh | รีเฟรช Token |
| PUT | /api/auth/password | เปลี่ยนรหัสผ่าน |
| GET | /api/auth/me | ข้อมูลผู้ใช้ปัจจุบัน |
| GET | /api/users | รายการผู้ใช้ |
| POST | /api/users | สร้างผู้ใช้ |
| PUT | /api/users/:id | แก้ไขผู้ใช้ |
| DELETE | /api/users/:id | ลบผู้ใช้ |
| GET | /api/categories | หมวดหมู่ทั้งหมด |
| POST | /api/categories | สร้างหมวดหมู่ |
| PUT | /api/categories/:id | แก้ไขหมวดหมู่ |
| DELETE | /api/categories/:id | ลบหมวดหมู่ |
| GET | /api/products | รายการสินค้า |
| GET | /api/products/barcode/:code | ค้นหาด้วยบาร์โค้ด |
| POST | /api/products | สร้างสินค้า |
| PUT | /api/products/:id | แก้ไขสินค้า |
| DELETE | /api/products/:id | ลบสินค้า |
| GET | /api/inventory | สต๊อกสินค้า |
| GET | /api/inventory/low-stock | สินค้าใกล้หมด |
| POST | /api/inventory/adjust | ปรับสต๊อก |
| GET | /api/inventory/logs | ประวัติสต๊อก |
| POST | /api/pos/checkout | ชำระเงิน |
| GET | /api/pos/transactions | รายการขาย |
| GET | /api/pos/transactions/:id | รายละเอียดการขาย |
| GET | /api/reports/sales | รายงานยอดขาย |
| GET | /api/reports/products | รายงานสินค้า |
| GET | /api/reports/profit-loss | รายงานกำไรขาดทุน |
| GET | /api/reports/inventory | รายงานสต๊อก |
| GET | /api/dashboard/stats | สถิติแดชบอร์ด |
| GET | /api/dashboard/charts | ข้อมูลกราฟ |
| POST | /api/barcode/generate | สร้างบาร์โค้ด |
| GET | /api/barcode/validate/:code | ตรวจสอบบาร์โค้ด |

## 🔧 คำสั่ง Docker ที่ใช้บ่อย

```bash
# เริ่มทุก service
docker-compose up -d

# เริ่มพร้อม phpMyAdmin
docker-compose --profile dev up -d

# ดู logs
docker-compose logs -f backend
docker-compose logs -f frontend

# หยุดทุก service
docker-compose down

# หยุดและลบข้อมูล (ระวัง!)
docker-compose down -v

# Rebuild
docker-compose up -d --build

# เข้า shell ของ container
docker exec -it pos-backend sh
docker exec -it pos-mysql mysql -u root -p
```

## 📝 หมายเหตุ

- ระบบรองรับภาษาไทยเต็มรูปแบบ
- ข้อมูลเริ่มต้น: admin/admin123
- สินค้าตัวอย่าง 15 รายการถูกสร้างอัตโนมัติ
- ระบบรองรับการอัปโหลดรูปภาพสินค้า
- Barcode ถูกสร้างอัตโนมัติสำหรับสินค้าใหม่

## 📄 License

MIT License
