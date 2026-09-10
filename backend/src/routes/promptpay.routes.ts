import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  createQR,
  orderStatus,
  checkNow,
  events,
  webhook,
  paynoiStatus,
} from '../controllers/promptpay.controller';

const router = Router();

/**
 * EventSource ส่ง Authorization header ไม่ได้ → รับ token ผ่าน ?token= ได้
 */
function authOrQuery(req: Request, res: Response, next: NextFunction): void {
  if (req.headers.authorization) {
    authMiddleware(req, res, next);
    return;
  }
  const token = String(req.query.token || '');
  if (!token) {
    res.status(401).json({ success: false, message: 'ไม่พบ Token กรุณาเข้าสู่ระบบ', error: 'NO_TOKEN' });
    return;
  }
  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as Request['user'];
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token ไม่ถูกต้อง', error: 'INVALID_TOKEN' });
  }
}

router.post('/create-qr', authMiddleware, createQR);
router.get('/order-status', authMiddleware, orderStatus);
router.post('/check-now', authMiddleware, checkNow);
router.get('/status', authMiddleware, paynoiStatus);
router.get('/events', authOrQuery, events);

// Webhook จาก Paynoi — ไม่ผ่าน JWT (verify ด้วย HMAC ใน controller แทน)
router.post('/webhook', webhook);

export default router;
