import { Router } from 'express';
import { body } from 'express-validator';
import * as usersController from '../controllers/users.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

router.get('/', authMiddleware, roleMiddleware('admin', 'manager'), usersController.getUsers);

router.post(
  '/',
  authMiddleware,
  roleMiddleware('admin', 'manager'),
  validate([
    body('username').notEmpty().withMessage('กรุณาระบุชื่อผู้ใช้'),
    body('password').isLength({ min: 6 }).withMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
    body('full_name').notEmpty().withMessage('กรุณาระบุชื่อ-นามสกุล'),
    body('role').isIn(['admin', 'manager', 'cashier']).withMessage('บทบาทไม่ถูกต้อง'),
  ]),
  usersController.createUser
);

router.put('/:id', authMiddleware, roleMiddleware('admin', 'manager'), usersController.updateUser);
router.delete('/:id', authMiddleware, roleMiddleware('admin', 'manager'), usersController.deleteUser);

router.put(
  '/:id/reset-password',
  authMiddleware,
  roleMiddleware('admin', 'manager'),
  validate([
    body('oldPassword').notEmpty().withMessage('กรุณาระบุรหัสผ่านเดิม'),
    body('newPassword').isLength({ min: 6 }).withMessage('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'),
  ]),
  usersController.resetPassword
);

export default router;
