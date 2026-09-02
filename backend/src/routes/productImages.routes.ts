import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import * as productImagesService from '../services/productImages.service';

const router = Router();

// Get all saved product images (admin/manager)
router.get('/', authMiddleware, roleMiddleware('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const images = await productImagesService.getAllProductImages();
    res.json({ success: true, data: images });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get image by product name
router.get('/:productName', authMiddleware, async (req: Request, res: Response) => {
  try {
    const image = await productImagesService.getImageByProductName(req.params.productName);
    if (!image) {
      return res.status(404).json({ success: false, message: 'ไม่พบรูปภาพสำหรับสินค้านี้' });
    }
    res.json({ success: true, data: image });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Save product image (admin/manager)
router.post('/', authMiddleware, roleMiddleware('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { product_name, image_url } = req.body;

    if (!product_name || !image_url) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อสินค้าและ URL รูปภาพ' });
    }

    await productImagesService.saveProductImage(product_name, image_url);
    res.json({ success: true, message: 'บันทึกรูปภาพสำเร็จ' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update product image (admin/manager)
router.put('/:id', authMiddleware, roleMiddleware('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { product_name, image_url } = req.body;

    if (!product_name || !image_url) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อสินค้าและ URL รูปภาพ' });
    }

    const success = await productImagesService.updateProductImage(Number(req.params.id), product_name, image_url);
    if (!success) {
      return res.status(404).json({ success: false, message: 'ไม่พบรูปภาพ' });
    }
    res.json({ success: true, message: 'แก้ไขรูปภาพสำเร็จ' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete product image (admin/manager)
router.delete('/:id', authMiddleware, roleMiddleware('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const success = await productImagesService.deleteProductImage(Number(req.params.id));
    if (!success) {
      return res.status(404).json({ success: false, message: 'ไม่พบรูปภาพ' });
    }
    res.json({ success: true, message: 'ลบรูปภาพสำเร็จ' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Sync all product images to products table (admin/manager)
router.post('/sync', authMiddleware, roleMiddleware('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const updated = await productImagesService.syncProductImages();
    res.json({ success: true, message: `อัปเดตรูปภาพสำเร็จ ${updated} รายการ`, updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
