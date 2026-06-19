import { Request, Response } from 'express';
import * as posService from '../services/pos.service';

// POST /api/pos/checkout
export async function checkout(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await posService.checkout(userId, req.body);

    if (!result) {
      res.status(400).json({ success: false, message: 'การชำระเงินไม่ถูกต้องหรือยอดไม่พอ' });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'การขายสำเร็จ',
      data: result,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการขาย' });
  }
}

// GET /api/pos/transactions
export async function getTransactions(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const startDate = req.query.start_date as string | undefined;
    const endDate = req.query.end_date as string | undefined;

    const { transactions, total } = await posService.getTransactions(page, limit, startDate, endDate);

    res.json({
      success: true,
      data: transactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// GET /api/pos/transactions/:id
export async function getTransactionById(req: Request, res: Response): Promise<void> {
  try {
    const result = await posService.getTransactionById(parseInt(req.params.id, 10));

    if (!result) {
      res.status(404).json({ success: false, message: 'ไม่พบรายการขาย' });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// GET /api/pos/today-sold-items
export async function getTodaySoldItems(req: Request, res: Response): Promise<void> {
  try {
    const items = await posService.getTodaySoldItems();
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Get today sold items error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}
