import { Router } from 'express';
import * as barcodeController from '../controllers/barcode.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

router.post('/generate', authMiddleware, roleMiddleware('admin', 'manager'), barcodeController.generateBarcode);
router.get('/validate/:code', authMiddleware, barcodeController.validateBarcode);

export default router;
