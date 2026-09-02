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
    const includeInactive = req.query.include_inactive === 'true';

    const { products, total } = await productsService.getProducts(page, limit, search, categoryId, includeInactive);

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

// POST /api/products/import
export async function importProducts(req: Request, res: Response): Promise<void> {
  try {
    const rows = req.body.rows as { name?: string; price?: number | string; cost?: number | string; unit?: string; sku?: string; barcode?: string; category?: string }[];

    const result = await productsService.importProducts(rows);
    const msg = `นำเข้าสำเร็จ ${result.imported} รายการ${result.skipped.length ? `, ข้าม (ไม่ผ่านเงื่อนไข) ${result.skipped.length} รายการ` : ''}`;
    res.json({ success: true, message: msg, data: result });
  } catch (error) {
    console.error('Import products error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล' });
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

// POST /api/products/upload-image
export async function uploadImage(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์รูปภาพ' });
      return;
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ success: true, data: { url } });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ' });
  }
}

// POST /api/products
export async function createProduct(req: Request, res: Response): Promise<void> {
  try {
    const { category_id, name, sku, barcode, price, cost, unit } = req.body;
    // default เปิดใช้งาน หากไม่ระบุ
    const is_active = !(req.body.is_active === false || req.body.is_active === 'false');
    const image_url = req.file ? `/uploads/${req.file.filename}` : undefined;

    const id = await productsService.createProduct({
      category_id, name, sku, barcode, image_url, price, cost, unit, is_active,
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
    const { category_id, name, sku, barcode, price, cost, unit, remove_image } = req.body;
    // convert from FormData (string) + JSON; ถ้าไม่ระบุให้คงค่าเดิมไว้
    const is_active =
      req.body.is_active === undefined
        ? undefined
        : !(req.body.is_active === false || req.body.is_active === 'false');

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
    const userId = (req as any).user?.id;
    const success = await productsService.deleteProduct(id, userId);
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

// GET /api/products/archived
export async function getArchivedProducts(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string | undefined;

    const { products, total } = await productsService.getArchivedProducts(page, limit, search);

    res.json({
      success: true,
      data: products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get archived products error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// POST /api/products/archived/:id/restore
export async function restoreProduct(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const success = await productsService.restoreProduct(id);
    if (!success) {
      res.status(404).json({ success: false, message: 'ไม่พบสินค้าที่เก็บถาวร' });
      return;
    }
    res.json({ success: true, message: 'กู้คืนสินค้าสำเร็จ' });
  } catch (error) {
    console.error('Restore product error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// DELETE /api/products/archived/:id
export async function deleteArchivedProduct(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const success = await productsService.permanentlyDeleteArchivedProduct(id);
    if (!success) {
      res.status(404).json({ success: false, message: 'ไม่พบสินค้าที่เก็บถาวร' });
      return;
    }
    res.json({ success: true, message: 'ลบสินค้าถาวรสำเร็จ' });
  } catch (error) {
    console.error('Delete archived product error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}
