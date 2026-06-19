import pool from '../config/database';
import { Transaction, TransactionItem, Payment, CartItem, CheckoutRequest } from '../models/types';
import { generateTransactionCode } from '../utils/barcode.util';

/**
 * POS Service
 * จัดการการขายหน้าร้าน
 */

// Process checkout
export async function checkout(
  userId: number,
  data: CheckoutRequest
): Promise<{ transactionId: number; transactionCode: string } | null> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const transactionCode = generateTransactionCode();

    // Calculate totals
    let totalAmount = 0;
    for (const item of data.items) {
      const subtotal = item.price * item.quantity - item.discount;
      totalAmount += subtotal;
    }

    // Apply discount
    let discountAmount = data.discount_amount;
    if (data.discount_type === 'percent') {
      discountAmount = (totalAmount * data.discount_amount) / 100;
    }

    const afterDiscount = totalAmount - discountAmount;
    const vatAmount = (afterDiscount * data.vat_rate) / 100;
    const netAmount = afterDiscount + vatAmount;

    // Validate payments
    const totalPayment = data.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPayment < netAmount - 0.01) {
      await connection.rollback();
      return null;
    }

    // Create transaction
    const [txResult] = await connection.execute(
      `INSERT INTO transactions
       (transaction_code, user_id, total_amount, discount_amount, discount_type, vat_amount, vat_rate, net_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
      [
        transactionCode,
        userId,
        totalAmount,
        discountAmount,
        data.discount_type,
        vatAmount,
        data.vat_rate,
        netAmount,
      ]
    );

    const transactionId = (txResult as { insertId: number }).insertId;

    // Create transaction items and deduct stock
    for (const item of data.items) {
      const subtotal = item.price * item.quantity - item.discount;

      await connection.execute(
        `INSERT INTO transaction_items
         (transaction_id, product_id, product_name, barcode, quantity, unit_price, discount, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transactionId,
          item.product_id,
          item.product_name,
          item.barcode,
          item.quantity,
          item.price,
          item.discount,
          subtotal,
        ]
      );

      // Deduct stock
      await connection.execute(
        'UPDATE inventory SET quantity = GREATEST(quantity - ?, 0) WHERE product_id = ?',
        [item.quantity, item.product_id]
      );

      // Log stock out
      const [invRows] = await connection.execute(
        'SELECT quantity FROM inventory WHERE product_id = ?',
        [item.product_id]
      );
      const currentQty = (invRows as { quantity: number }[])[0]?.quantity || 0;

      await connection.execute(
        `INSERT INTO inventory_logs (product_id, type, quantity, before_qty, after_qty, reason, user_id)
         VALUES (?, 'out', ?, ?, ?, ?, ?)`,
        [
          item.product_id,
          item.quantity,
          currentQty + item.quantity,
          currentQty,
          `ขาย #${transactionCode}`,
          userId,
        ]
      );
    }

    // Record payments
    for (const payment of data.payments) {
      await connection.execute(
        `INSERT INTO payments (transaction_id, method, amount, reference)
         VALUES (?, ?, ?, ?)`,
        [transactionId, payment.method, payment.amount, payment.reference || null]
      );
    }

    await connection.commit();
    return { transactionId, transactionCode };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Get transactions with pagination
export async function getTransactions(
  page: number = 1,
  limit: number = 20,
  startDate?: string,
  endDate?: string
): Promise<{ transactions: Transaction[]; total: number }> {
  const offset = (page - 1) * limit;
  let whereClause = '';
  const params: (string | number)[] = [];

  if (startDate && endDate) {
    whereClause = 'WHERE created_at BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) as total FROM transactions ${whereClause}`,
    params
  );
  const total = (countRows as { total: number }[])[0].total;

  const [rows] = await pool.execute(
    `SELECT * FROM transactions ${whereClause} ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );

  return { transactions: rows as Transaction[], total };
}

// Get transaction by ID with items and payments
export async function getTransactionById(id: number): Promise<{
  transaction: Transaction;
  items: TransactionItem[];
  payments: Payment[];
} | null> {
  const [txRows] = await pool.execute('SELECT * FROM transactions WHERE id = ?', [id]);
  const transactions = txRows as Transaction[];

  if (transactions.length === 0) return null;

  const [itemRows] = await pool.execute(
    'SELECT * FROM transaction_items WHERE transaction_id = ?',
    [id]
  );

  const [paymentRows] = await pool.execute(
    'SELECT * FROM payments WHERE transaction_id = ?',
    [id]
  );

  return {
    transaction: transactions[0],
    items: itemRows as TransactionItem[],
    payments: paymentRows as Payment[],
  };
}

// Get today's sold items (grouped by product)
export async function getTodaySoldItems(): Promise<
  { product_name: string; quantity: number; subtotal: number; created_at: string }[]
> {
  const [rows] = await pool.execute(
    `SELECT
       ti.product_name,
       SUM(ti.quantity) as quantity,
       SUM(ti.subtotal) as subtotal,
       MAX(t.created_at) as created_at
     FROM transaction_items ti
     JOIN transactions t ON ti.transaction_id = t.id
     WHERE t.status = 'completed' AND DATE(t.created_at) = CURDATE()
     GROUP BY ti.product_id, ti.product_name
     ORDER BY MAX(t.created_at) DESC`
  );
  return rows as { product_name: string; quantity: number; subtotal: number; created_at: string }[];
}
