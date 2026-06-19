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

export default router;
