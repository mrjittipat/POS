import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Global Error Handler Middleware
 * จัดการข้อผิดพลาดทั้งหมดในระบบ
 */
export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  // Multer errors
  if (err.name === 'MulterError') {
    res.status(400).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์',
      error: err.message,
    });
    return;
  }

  // Default error
  res.status(500).json({
    success: false,
    message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
    error: env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
