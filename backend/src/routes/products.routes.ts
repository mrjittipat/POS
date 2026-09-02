import { Router } from 'express';
import { body } from 'express-validator';
import * as productsController from '../controllers/products.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.get('/', authMiddleware, productsController.getProducts);
router.get('/barcode/:code', authMiddleware, productsController.getProductByBarcode);
router.get('/:id', authMiddleware, productsController.getProductById);

// Upload image only (for product images management)
router.post(
  '/upload-image',
  authMiddleware,
  roleMiddleware('admin', 'manager'),
  upload.single('image'),
  productsController.uploadImage
);

// นำเข้าข้อมูลสินค้าจำนวนมาก (CSV → rows) — ตรวจเงื่อนไขและข้ามรายการที่ไม่ผ่าน
router.post(
  '/import',
  authMiddleware,
  roleMiddleware('admin', 'manager'),
  validate([
    body('rows').isArray({ min: 1 }).withMessage('ไม่มีข้อมูลที่จะนำเข้า'),
    body('rows').custom((rows: unknown[]) => rows.length <= 500).withMessage('นำเข้าได้ครั้งละไม่เกิน 500 รายการ'),
  ]),
  productsController.importProducts
);

router.post(
  '/',
  authMiddleware,
  roleMiddleware('admin', 'manager'),
  upload.single('image'),
  validate([
    body('name').notEmpty().withMessage('กรุณาระบุชื่อสินค้า'),
    body('price').isFloat({ min: 0 }).withMessage('ราคาต้องเป็นตัวเลข'),
  ]),
  productsController.createProduct
);

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware('admin', 'manager'),
  upload.single('image'),
  productsController.updateProduct
);

router.delete('/:id', authMiddleware, roleMiddleware('admin'), productsController.deleteProduct);

// Archived products routes
router.get('/archived/list', authMiddleware, roleMiddleware('admin'), productsController.getArchivedProducts);
router.post('/archived/:id/restore', authMiddleware, roleMiddleware('admin'), productsController.restoreProduct);
router.delete('/archived/:id', authMiddleware, roleMiddleware('admin'), productsController.deleteArchivedProduct);

export default router;
