import app from './app';
import { env } from './config/env';
import { testConnection } from './config/database';
import fs from 'fs';
import path from 'path';

/**
 * POS System - Backend Entry Point
 * จุดเริ่มต้นของเซิร์ฟเวอร์
 */

async function startServer(): Promise<void> {
  // Create uploads directory if not exists
  const uploadDir = path.join(__dirname, '..', env.UPLOAD_DIR);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('❌ Cannot connect to database. Exiting...');
    process.exit(1);
  }

  // Start server
  app.listen(env.PORT, () => {
    console.log('');
    console.log('🚀 POS System API Server Started');
    console.log(`📍 Environment: ${env.NODE_ENV}`);
    console.log(`🌐 URL: http://localhost:${env.PORT}`);
    console.log(`📚 API Docs: http://localhost:${env.PORT}/api-docs`);
    console.log(`❤️  Health: http://localhost:${env.PORT}/api/health`);
    console.log('');
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});
