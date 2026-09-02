import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

router.post(
  '/login',
  validate([
    body('username').notEmpty().withMessage('กรุณาระบุชื่อผู้ใช้'),
    body('password').notEmpty().withMessage('กรุณาระบุรหัสผ่าน'),
  ]),
  authController.login
);

router.post('/logout', authMiddleware, authController.logout);

router.post(
  '/refresh',
  validate([
    body('refreshToken').notEmpty().withMessage('กรุณาระบุ Refresh Token'),
  ]),
  authController.refresh
);

router.put(
  '/password',
  authMiddleware,
  validate([
    body('oldPassword').notEmpty().withMessage('กรุณาระบุรหัสผ่านเดิม'),
    body('newPassword').isLength({ min: 6 }).withMessage('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'),
  ]),
  authController.changePassword
);

router.put(
  '/profile',
  authMiddleware,
  validate([
    body('full_name').notEmpty().withMessage('กรุณาระบุชื่อ-นามสกุล'),
  ]),
  authController.updateProfile
);

router.get('/me', authMiddleware, authController.getMe);

export default router;
