import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/stats', authMiddleware, dashboardController.getStats);
router.get('/charts', authMiddleware, dashboardController.getCharts);
router.get('/sales-summary', authMiddleware, dashboardController.getSalesSummary);

export default router;
