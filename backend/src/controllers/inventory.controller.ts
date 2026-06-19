import { Request, Response } from 'express';
import * as inventoryService from '../services/inventory.service';

// GET /api/inventory
export async function getInventory(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const lowStock = req.query.low_stock === 'true';

    const { items, total } = await inventoryService.getInventory(page, limit, lowStock || undefined);

    res.json({
      success: true,
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// GET /api/inventory/low-stock
export async function getLowStock(req: Request, res: Response): Promise<void> {
  try {
    const items = await inventoryService.getLowStock();
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// POST /api/inventory/adjust
export async function adjustStock(req: Request, res: Response): Promise<void> {
  try {
    const { product_id, quantity, type, reason } = req.body;
    const userId = req.user!.userId;

    const success = await inventoryService.adjustStock(product_id, quantity, type, reason, userId);

    if (!success) {
      res.status(400).json({ success: false, message: 'ไม่สามารถปรับสต๊อกได้' });
      return;
    }

    res.json({ success: true, message: 'ปรับสต๊อกสำเร็จ' });
  } catch (error) {
    console.error('Adjust stock error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// GET /api/inventory/logs
export async function getInventoryLogs(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const productId = req.query.product_id ? parseInt(req.query.product_id as string, 10) : undefined;

    const { logs, total } = await inventoryService.getInventoryLogs(productId, page, limit);

    res.json({
      success: true,
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get inventory logs error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}
