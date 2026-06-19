import { Router } from 'express';
import { body } from 'express-validator';
import * as inventoryController from '../controllers/inventory.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

router.get('/', authMiddleware, inventoryController.getInventory);
router.get('/low-stock', authMiddleware, inventoryController.getLowStock);
router.get('/logs', authMiddleware, inventoryController.getInventoryLogs);

router.post(
  '/adjust',
  authMiddleware,
  roleMiddleware('admin', 'manager'),
  validate([
    body('product_id').isInt().withMessage('กรุณาระบุสินค้า'),
    body('quantity').isInt({ min: 1 }).withMessage('จำนวนต้องมากกว่า 0'),
    body('type').isIn(['in', 'out', 'adjustment']).withMessage('ประเภทไม่ถูกต้อง'),
    body('reason').notEmpty().withMessage('กรุณาระบุเหตุผล'),
  ]),
  inventoryController.adjustStock
);

export default router;
