import { Request, Response } from 'express';
import * as reportsService from '../services/reports.service';

// GET /api/reports/sales
export async function getSalesReport(req: Request, res: Response): Promise<void> {
  try {
    const { start_date, end_date, group_by } = req.query;

    if (!start_date || !end_date) {
      res.status(400).json({ success: false, message: 'กรุณาระบุช่วงวันที่' });
      return;
    }

    const result = await reportsService.getSalesReport(
      start_date as string,
      end_date as string,
      (group_by as 'day' | 'month' | 'year') || 'day'
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// GET /api/reports/products
export async function getProductReport(req: Request, res: Response): Promise<void> {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      res.status(400).json({ success: false, message: 'กรุณาระบุช่วงวันที่' });
      return;
    }

    const result = await reportsService.getProductReport(start_date as string, end_date as string);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Product report error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// GET /api/reports/profit-loss
export async function getProfitLossReport(req: Request, res: Response): Promise<void> {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      res.status(400).json({ success: false, message: 'กรุณาระบุช่วงวันที่' });
      return;
    }

    const result = await reportsService.getProfitLossReport(start_date as string, end_date as string);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('P&L report error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// GET /api/reports/inventory
export async function getInventoryReport(req: Request, res: Response): Promise<void> {
  try {
    const result = await reportsService.getInventoryReport();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Inventory report error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}
