import { Router } from 'express';
import * as reportsController from '../controllers/reports.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

router.get('/sales', authMiddleware, roleMiddleware('admin', 'manager', 'cashier'), reportsController.getSalesReport);
router.get('/products', authMiddleware, roleMiddleware('admin', 'manager', 'cashier'), reportsController.getProductReport);
router.get('/profit-loss', authMiddleware, roleMiddleware('admin', 'manager'), reportsController.getProfitLossReport);
router.get('/inventory', authMiddleware, roleMiddleware('admin', 'manager', 'cashier'), reportsController.getInventoryReport);

export default router;
