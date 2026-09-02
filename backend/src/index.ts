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

  const port = env.PORT;
  const server = app.listen(port, () => {
    console.log('');
    console.log('🚀 POS System API Server Started');
    console.log(`📍 Environment: ${env.NODE_ENV}`);
    console.log(`🌐 URL: http://localhost:${port}`);
    console.log(`📚 API Docs: http://localhost:${port}/api-docs`);
    console.log(`❤️  Health: http://localhost:${port}/api/health`);
    console.log('');
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} is already in use, trying ${port + 1}...`);
      server.close();
      const fallbackServer = app.listen(port + 1, () => {
        console.log('');
        console.log('🚀 POS System API Server Started');
        console.log(`📍 Environment: ${env.NODE_ENV}`);
        console.log(`🌐 URL: http://localhost:${port + 1}`);
        console.log(`📚 API Docs: http://localhost:${port + 1}/api-docs`);
        console.log(`❤️  Health: http://localhost:${port + 1}/api/health`);
        console.log('');
      });

      fallbackServer.on('error', (fallbackError: NodeJS.ErrnoException) => {
        console.error('❌ Failed to start server:', fallbackError);
        process.exit(1);
      });
      return;
    }

    console.error('❌ Failed to start server:', error);
    process.exit(1);
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
