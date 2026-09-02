import pool from '../config/database';

/**
 * Reports Service
 * จัดการรายงานต่างๆ
 */

// Sales report
// When startDate is 'CURDATE_INTERVAL', endDate is 'CURDATE', and days is provided,
// the query uses MySQL date functions to avoid UTC/local timezone mismatch.
export async function getSalesReport(
  startDate: string,
  endDate: string,
  groupBy: 'day' | 'month' | 'year' = 'day',
  days?: number
): Promise<{
  summary: {
    totalSales: number;
    totalOrders: number;
    totalItems: number;
    avgOrderValue: number;
    totalDiscount: number;
    totalVat: number;
  };
  chart: { label: string; sales: number; orders: number }[];
  paymentBreakdown: { method: string; amount: number; count: number }[];
}> {
  let dateFormat: string;
  switch (groupBy) {
    case 'year':
      dateFormat = '%Y';
      break;
    case 'month':
      dateFormat = '%Y-%m';
      break;
    default:
      dateFormat = '%Y-%m-%d';
  }

  // Build date filter — use MySQL CURDATE() to avoid UTC/local timezone mismatch
  const useDateFunctions = startDate === 'CURDATE_INTERVAL' && endDate === 'CURDATE' && days;
  const dateFilter = useDateFunctions
    ? `t.created_at >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)`
    : `DATE(t.created_at) BETWEEN '${startDate}' AND '${endDate}'`;
  const chartDateFilter = useDateFunctions
    ? `created_at >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)`
    : `DATE(created_at) BETWEEN '${startDate}' AND '${endDate}'`;

  // Summary
  const [summaryRows] = await pool.execute(
    `SELECT
       COALESCE(SUM(net_amount), 0) as totalSales,
       COUNT(*) as totalOrders,
       COALESCE(SUM((SELECT SUM(quantity) FROM transaction_items ti WHERE ti.transaction_id = t.id)), 0) as totalItems,
       COALESCE(AVG(net_amount), 0) as avgOrderValue,
       COALESCE(SUM(discount_amount), 0) as totalDiscount,
       COALESCE(SUM(vat_amount), 0) as totalVat
     FROM transactions t
     WHERE status = 'completed' AND ${dateFilter}`
  );

  const summary = (summaryRows as {
    totalSales: number;
    totalOrders: number;
    totalItems: number;
    avgOrderValue: number;
    totalDiscount: number;
    totalVat: number;
  }[])[0];

  // Chart data
  const [chartRows] = await pool.execute(
    `SELECT
       DATE_FORMAT(created_at, ?) as label,
       COALESCE(SUM(net_amount), 0) as sales,
       COUNT(*) as orders
     FROM transactions
     WHERE status = 'completed' AND ${chartDateFilter}
     GROUP BY label
     ORDER BY label ASC`,
    [dateFormat]
  );

  // Payment method breakdown
  const [paymentRows] = await pool.execute(
    `SELECT p.method, COALESCE(SUM(p.amount), 0) as amount, COUNT(DISTINCT p.transaction_id) as count
     FROM payments p
     JOIN transactions t ON p.transaction_id = t.id
     WHERE t.status = 'completed' AND ${dateFilter}
     GROUP BY p.method`
  );
  const paymentBreakdown = paymentRows as { method: string; amount: number; count: number }[];

  return {
    summary,
    chart: chartRows as { label: string; sales: number; orders: number }[],
    paymentBreakdown,
  };
}

// Product performance report
export async function getProductReport(
  startDate: string,
  endDate: string,
  limit: number = 20
): Promise<{
  topSelling: { product_id: number; product_name: string; quantity: number; revenue: number }[];
  lowSelling: { product_id: number; product_name: string; quantity: number; revenue: number }[];
}> {
  const [rows] = await pool.execute(
    `SELECT
       ti.product_id,
       ti.product_name,
       SUM(ti.quantity) as quantity,
       SUM(ti.subtotal) as revenue
     FROM transaction_items ti
     JOIN transactions t ON ti.transaction_id = t.id
     WHERE t.status = 'completed' AND DATE(t.created_at) BETWEEN ? AND ?
     GROUP BY ti.product_id, ti.product_name
     ORDER BY revenue DESC`,
    [startDate, endDate]
  );

  const products = rows as { product_id: number; product_name: string; quantity: number; revenue: number }[];

  return {
    topSelling: products.slice(0, limit),
    lowSelling: products.slice(-limit).reverse(),
  };
}

// Profit/Loss report
export async function getProfitLossReport(
  startDate: string,
  endDate: string
): Promise<{
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
}> {
  const [rows] = await pool.execute(
    `SELECT
       COALESCE(SUM(ti.subtotal), 0) as totalRevenue,
       COALESCE(SUM(p.cost * ti.quantity), 0) as totalCost
     FROM transaction_items ti
     JOIN transactions t ON ti.transaction_id = t.id
     JOIN products p ON ti.product_id = p.id
     WHERE t.status = 'completed' AND DATE(t.created_at) BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  const result = (rows as { totalRevenue: number; totalCost: number }[])[0];
  const grossProfit = result.totalRevenue - result.totalCost;
  const profitMargin = result.totalRevenue > 0 ? (grossProfit / result.totalRevenue) * 100 : 0;

  return {
    ...result,
    grossProfit,
    profitMargin,
  };
}

// Inventory report
export async function getInventoryReport(): Promise<{
  totalProducts: number;
  totalValue: number;
  totalCost: number;
  lowStockCount: number;
  outOfStockCount: number;
  byCategory: { category: string; count: number; value: number }[];
}> {
  const [summaryRows] = await pool.execute(
    `SELECT
       COUNT(DISTINCT p.id) as totalProducts,
       COALESCE(SUM(i.quantity * p.price), 0) as totalValue,
       COALESCE(SUM(i.quantity * p.cost), 0) as totalCost,
       SUM(CASE WHEN i.quantity <= i.min_stock AND i.quantity > 0 THEN 1 ELSE 0 END) as lowStockCount,
       SUM(CASE WHEN i.quantity = 0 THEN 1 ELSE 0 END) as outOfStockCount
     FROM products p
     JOIN inventory i ON p.id = i.product_id
     WHERE p.is_active = TRUE AND p.is_deleted = FALSE`
  );

  const summary = (summaryRows as {
    totalProducts: number;
    totalValue: number;
    totalCost: number;
    lowStockCount: number;
    outOfStockCount: number;
  }[])[0];

  const [categoryRows] = await pool.execute(
    `SELECT
       COALESCE(c.name, 'ไม่มีหมวดหมู่') as category,
       COUNT(p.id) as count,
       COALESCE(SUM(i.quantity * p.price), 0) as value
     FROM products p
     JOIN inventory i ON p.id = i.product_id
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.is_active = TRUE AND p.is_deleted = FALSE
     GROUP BY c.name
     ORDER BY value DESC`
  );

  return {
    ...summary,
    byCategory: categoryRows as { category: string; count: number; value: number }[],
  };
}
