import { Router } from 'express';
import { body } from 'express-validator';
import * as categoriesController from '../controllers/categories.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

router.get('/', authMiddleware, categoriesController.getCategories);

router.post(
  '/',
  authMiddleware,
  roleMiddleware('admin', 'manager'),
  validate([
    body('name').notEmpty().withMessage('กรุณาระบุชื่อหมวดหมู่'),
  ]),
  categoriesController.createCategory
);

router.put('/:id', authMiddleware, roleMiddleware('admin', 'manager'), categoriesController.updateCategory);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), categoriesController.deleteCategory);

export default router;
