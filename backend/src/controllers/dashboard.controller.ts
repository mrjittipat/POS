import { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';
import * as reportsService from '../services/reports.service';

// GET /api/dashboard/stats
export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await dashboardService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// GET /api/dashboard/charts
export async function getCharts(req: Request, res: Response): Promise<void> {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const [salesChart, topProducts] = await Promise.all([
      dashboardService.getSalesChart(days),
      dashboardService.getTopProducts(),
    ]);

    res.json({ success: true, data: { salesChart, topProducts } });
  } catch (error) {
    console.error('Dashboard charts error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// GET /api/dashboard/sales-summary
export async function getSalesSummary(req: Request, res: Response): Promise<void> {
  try {
    const days = parseInt(req.query.days as string) || 30;
    // Use MySQL CURDATE() to get correct date in Bangkok timezone (+07:00)
    const result = await reportsService.getSalesReport(
      'CURDATE_INTERVAL', // sentinel: will be handled by service
      'CURDATE',
      days > 90 ? 'month' : 'day',
      days
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Sales summary error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}
