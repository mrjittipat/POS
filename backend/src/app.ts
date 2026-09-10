import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { errorMiddleware } from './middleware/error.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import categoriesRoutes from './routes/categories.routes';
import productsRoutes from './routes/products.routes';
import inventoryRoutes from './routes/inventory.routes';
import posRoutes from './routes/pos.routes';
import reportsRoutes from './routes/reports.routes';
import dashboardRoutes from './routes/dashboard.routes';
import barcodeRoutes from './routes/barcode.routes';
import migrationRoutes from './routes/migration.routes';
import productImagesRoutes from './routes/productImages.routes';
import promptpayRoutes from './routes/promptpay.routes';
import { startAutoCheck } from './services/promptpay.service';

/**
 * Express Application Setup
 * ตั้งค่า Express app พร้อม middleware และ routes
 */
const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

// Body parsing (เก็บ rawBody ไว้ verify Paynoi webhook HMAC)
app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: string }).rawBody = buf.toString();
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', env.UPLOAD_DIR)));

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'POS System API is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/barcode', barcodeRoutes);
app.use('/api/migration', migrationRoutes);
app.use('/api/product-images', productImagesRoutes);
app.use('/api/promptpay', promptpayRoutes);

// Auto-check ยอดโอน Paynoi ทุก 10 วิ (เริ่มเฉพาะเมื่อตั้งค่า key ครบ)
startAutoCheck();

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'ไม่พบ API Endpoint ที่ร้องขอ',
  });
});

// Global error handler
app.use(errorMiddleware);

export default app;
