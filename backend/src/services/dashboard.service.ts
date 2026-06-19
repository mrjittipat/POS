import pool from '../config/database';

/**
 * Dashboard Service
 * จัดการข้อมูลแดชบอร์ด
 */

// Get dashboard statistics
export async function getDashboardStats(): Promise<{
  todaySales: number;
  todayOrders: number;
  totalProducts: number;
  lowStockCount: number;
  cashSales: number;
  cashCount: number;
  promptpaySales: number;
  promptpayCount: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
}> {
  const [rows] = await pool.execute(
    `SELECT
       (SELECT COALESCE(SUM(net_amount), 0) FROM transactions WHERE status = 'completed' AND DATE(created_at) = CURDATE()) as todaySales,
       (SELECT COUNT(*) FROM transactions WHERE status = 'completed' AND DATE(created_at) = CURDATE()) as todayOrders,
       (SELECT COUNT(*) FROM products WHERE is_active = TRUE) as totalProducts,
       (SELECT COUNT(*) FROM inventory i JOIN products p ON i.product_id = p.id WHERE i.quantity <= i.min_stock AND p.is_active = TRUE) as lowStockCount`
  );

  const stats = (rows as {
    todaySales: number;
    todayOrders: number;
    totalProducts: number;
    lowStockCount: number;
  }[])[0];

  // Payment method breakdown for today
  const [payRows] = await pool.execute(
    `SELECT p.method, COALESCE(SUM(p.amount), 0) as amount, COUNT(DISTINCT p.transaction_id) as count
     FROM payments p
     JOIN transactions t ON p.transaction_id = t.id
     WHERE t.status = 'completed' AND DATE(t.created_at) = CURDATE()
     GROUP BY p.method`
  );
  const payments = payRows as { method: string; amount: number; count: number }[];
  const cashData = payments.find(p => p.method === 'cash') || { amount: 0, count: 0 };
  const promptpayData = payments.find(p => p.method === 'promptpay') || { amount: 0, count: 0 };

  // Total revenue & cost (all time)
  const [profitRows] = await pool.execute(
    `SELECT
       COALESCE(SUM(ti.subtotal), 0) as totalRevenue,
       COALESCE(SUM(p.cost * ti.quantity), 0) as totalCost
     FROM transaction_items ti
     JOIN transactions t ON ti.transaction_id = t.id
     JOIN products p ON ti.product_id = p.id
     WHERE t.status = 'completed'`
  );
  const profitData = (profitRows as { totalRevenue: number; totalCost: number }[])[0];

  return {
    ...stats,
    cashSales: cashData.amount,
    cashCount: cashData.count,
    promptpaySales: promptpayData.amount,
    promptpayCount: promptpayData.count,
    totalRevenue: profitData.totalRevenue,
    totalCost: profitData.totalCost,
    grossProfit: profitData.totalRevenue - profitData.totalCost,
  };
}

// Get sales chart data (last N days)
export async function getSalesChart(days: number = 7): Promise<
  { date: string; amount: number }[]
> {
  // Use (days - 1) because CURDATE() is included as day 1
  const safeDays = Math.max(1, Math.min(365, Math.floor(days))) - 1;
  const [rows] = await pool.execute(
    `SELECT
       DATE(created_at) as date,
       COALESCE(SUM(net_amount), 0) as amount
     FROM transactions
     WHERE status = 'completed' AND created_at >= DATE_SUB(CURDATE(), INTERVAL ${safeDays} DAY)
     GROUP BY DATE(created_at)
     ORDER BY date ASC`
  );

  return rows as { date: string; amount: number }[];
}

// Get top selling products (last 30 days)
export async function getTopProducts(limit: number = 5): Promise<
  { name: string; quantity: number; revenue: number }[]
> {
  // Use string interpolation for LIMIT since it must be an integer literal in MySQL
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const [rows] = await pool.execute(
    `SELECT
       ti.product_name as name,
       SUM(ti.quantity) as quantity,
       SUM(ti.subtotal) as revenue
     FROM transaction_items ti
     JOIN transactions t ON ti.transaction_id = t.id
     WHERE t.status = 'completed' AND t.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
     GROUP BY ti.product_id, ti.product_name
     ORDER BY revenue DESC
     LIMIT ${safeLimit}`
  );

  return rows as { name: string; quantity: number; revenue: number }[];
}
