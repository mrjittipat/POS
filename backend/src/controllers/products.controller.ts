import { Request, Response } from 'express';
import * as productsService from '../services/products.service';

/**
 * Products Controller
 */

// GET /api/products
export async function getProducts(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string | undefined;
    const categoryId = req.query.category_id ? parseInt(req.query.category_id as string, 10) : undefined;

    const { products, total } = await productsService.getProducts(page, limit, search, categoryId);

    res.json({
      success: true,
      data: products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// GET /api/products/barcode/:code
export async function getProductByBarcode(req: Request, res: Response): Promise<void> {
  try {
    const product = await productsService.getProductByBarcode(req.params.code);
    if (!product) {
      res.status(404).json({ success: false, message: 'ไม่พบสินค้า' });
      return;
    }
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Get product by barcode error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// GET /api/products/:id
export async function getProductById(req: Request, res: Response): Promise<void> {
  try {
    const product = await productsService.getProductById(parseInt(req.params.id, 10));
    if (!product) {
      res.status(404).json({ success: false, message: 'ไม่พบสินค้า' });
      return;
    }
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// POST /api/products
export async function createProduct(req: Request, res: Response): Promise<void> {
  try {
    const { category_id, name, sku, barcode, price, cost, unit } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : undefined;

    const id = await productsService.createProduct({
      category_id, name, sku, barcode, image_url, price, cost, unit,
    });

    res.status(201).json({ success: true, message: 'สร้างสินค้าสำเร็จ', data: { id } });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// PUT /api/products/:id
export async function updateProduct(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const { category_id, name, sku, barcode, price, cost, unit, is_active, remove_image } = req.body;

    // Handle image: new file uploaded, or remove existing, or keep unchanged
    let image_url: string | undefined | null;
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    } else if (remove_image === 'true') {
      image_url = null;  // Signal to remove image
    }
    // If neither file nor remove_image, image_url stays undefined (keep existing)

    const success = await productsService.updateProduct(id, {
      category_id, name, sku, barcode, image_url, price, cost, unit, is_active,
    });

    if (!success) {
      res.status(404).json({ success: false, message: 'ไม่พบสินค้า' });
      return;
    }
    res.json({ success: true, message: 'แก้ไขสินค้าสำเร็จ' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// DELETE /api/products/:id
export async function deleteProduct(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const success = await productsService.deleteProduct(id);
    if (!success) {
      res.status(404).json({ success: false, message: 'ไม่พบสินค้า' });
      return;
    }
    res.json({ success: true, message: 'ลบสินค้าสำเร็จ' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}
