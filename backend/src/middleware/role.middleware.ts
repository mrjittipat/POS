import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/types';

/**
 * Role-based Authorization Middleware
 * ตรวจสอบสิทธิ์ผู้ใช้ตามบทบาท
 * @param allowedRoles - รายการบทบาทที่ได้รับอนุญาต
 */
export function roleMiddleware(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ',
        error: 'UNAUTHORIZED',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้',
        error: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
}
