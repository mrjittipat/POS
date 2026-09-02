import { Router } from 'express';
import { body } from 'express-validator';
import * as posController from '../controllers/pos.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

router.post(
  '/checkout',
  authMiddleware,
  validate([
    body('items').isArray({ min: 1 }).withMessage('ต้องมีสินค้าอย่างน้อย 1 รายการ'),
    body('payments').isArray({ min: 1 }).withMessage('ต้องมีการชำระเงินอย่างน้อย 1 ช่องทาง'),
  ]),
  posController.checkout
);

router.post(
  '/reset-sales',
  authMiddleware,
  roleMiddleware('admin', 'manager'),
  validate([body('scope').optional().isIn(['today', 'all']).withMessage('scope ต้องเป็น today หรือ all')]),
  posController.resetSales
);

router.get('/transactions', authMiddleware, posController.getTransactions);
router.get('/transactions/:id', authMiddleware, posController.getTransactionById);
router.get('/today-sold-items', authMiddleware, posController.getTodaySoldItems);

export default router;
