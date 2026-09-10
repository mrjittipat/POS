import axios from 'axios';
import crypto from 'crypto';
import { env } from '../config/env';

/**
 * PromptPay Service — port จาก Topup-Kbank (Topup/Topup-kbank/backend/server.js)
 * สร้าง QR ตามยอด + จับคู่ยอดเงินเข้าผ่าน Paynoi (ยอดตรง + trans_id ใหม่กว่า baseline + FIFO)
 */

export type PromptPayOrderStatus = 'pending' | 'paid' | 'expired';

export interface PromptPayOrder {
  transactionId: string;
  amount: number;
  status: PromptPayOrderStatus;
  createdAt: number;
  baselineTransId: string | null;
  payment: PaynoiTransaction | null;
}

export interface PaynoiTransaction {
  transId: string;
  amount: number;
  senderName: string;
  time: string;
  raw: unknown;
}

interface SseClient {
  write: (chunk: string) => void;
}

const orders = new Map<string, PromptPayOrder>();
const usedTransIds = new Set<string>();
const sseClients = new Set<SseClient>();

const ORDER_TTL_MS = 30 * 60 * 1000; // 30 นาที
const AUTO_CHECK_INTERVAL_MS = 10_000;

function normalizeAmount(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[,฿\s]/g, '');
    if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function extractAmount(tx: Record<string, unknown>): number | null {
  const candidates = [
    tx.amount,
    tx.transfer_amount,
    tx.total,
    tx.money,
    (tx.data as Record<string, unknown> | undefined)?.amount,
  ];
  for (const c of candidates) {
    const n = normalizeAmount(c);
    if (n !== null) return n;
  }
  return null;
}

function extractTransId(tx: Record<string, unknown>): string {
  const candidates = [
    tx.trans_id,
    tx.transaction_id,
    tx.txid,
    tx.id,
    tx.ref,
    tx.reference,
    (tx.data as Record<string, unknown> | undefined)?.trans_id,
  ];
  for (const c of candidates) {
    if (c !== null && c !== undefined && String(c).trim() !== '') return String(c);
  }
  return `idx-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function extractSender(tx: Record<string, unknown>): string {
  const data = (tx.data as Record<string, unknown> | undefined) || {};
  const candidates = [
    tx.sender_name,
    tx.sender,
    tx.from,
    tx.customer,
    tx.name,
    data.sender_name,
    data.sender,
    tx.note,
    tx.remark,
  ];
  for (const c of candidates) {
    if (c && String(c).trim() !== '') return String(c);
  }
  return 'ไม่ระบุชื่อ';
}

function extractTime(tx: Record<string, unknown>): string {
  const candidates = [tx.time, tx.date, tx.created_at, tx.timestamp, tx.datetime];
  for (const c of candidates) {
    if (c) return String(c);
  }
  return new Date().toISOString();
}

function compareTransId(a: string, b: string | null): boolean {
  if (!b) return true; // ไม่มี baseline = ใหม่กว่าเสมอ
  if (a === b) return false;
  const numA = /^\d+$/.test(a) ? BigInt(a) : null;
  const numB = /^\d+$/.test(b) ? BigInt(b) : null;
  if (numA !== null && numB !== null) return numA > numB;
  return a > b; // fallback เปรียบเทียบ string
}

function buildTransaction(tx: Record<string, unknown>): PaynoiTransaction | null {
  const amount = extractAmount(tx);
  if (amount === null) return null;
  return {
    transId: extractTransId(tx),
    amount,
    senderName: extractSender(tx),
    time: extractTime(tx),
    raw: tx,
  };
}

function extractTransactionList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    for (const key of ['data', 'transactions', 'items', 'result', 'list']) {
      const v = obj[key];
      if (Array.isArray(v)) return v as Record<string, unknown>[];
      if (v && typeof v === 'object' && Array.isArray((v as Record<string, unknown>).data)) {
        return (v as Record<string, unknown>).data as Record<string, unknown>[];
      }
    }
  }
  return [];
}

async function fetchPaynoiTransactions(): Promise<PaynoiTransaction[]> {
  if (!env.PAYNOI_API_KEY || !env.PAYNOI_RECORD_KEY) {
    throw new Error('PAYNOI_API_KEY / PAYNOI_RECORD_KEY ยังไม่ได้ตั้งค่าใน .env');
  }
  const apiUrl =
    `https://paynoi.com/api_line?api_key=${encodeURIComponent(env.PAYNOI_API_KEY)}` +
    `&record_key=${encodeURIComponent(env.PAYNOI_RECORD_KEY as string)}&_=${Date.now()}`;
  const response = await axios.get(apiUrl, {
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
  if (response.data?.status !== 'success') {
    throw new Error('Paynoi API ตอบกลับ status: ' + response.data?.status);
  }
  const list = extractTransactionList(response.data);
  const out: PaynoiTransaction[] = [];
  for (const raw of list) {
    const tx = buildTransaction(raw);
    if (tx) out.push(tx);
  }
  // trans_id เป็นเลขยาวเพิ่มขึ้นตามเวลา — เรียงใหม่สุดก่อน เหมือน Topup-Kbank
  out.sort((a, b) => {
    const na = /^\d+$/.test(a.transId) ? BigInt(a.transId) : null;
    const nb = /^\d+$/.test(b.transId) ? BigInt(b.transId) : null;
    if (na !== null && nb !== null) return na > nb ? -1 : na < nb ? 1 : 0;
    return a.transId > b.transId ? -1 : a.transId < b.transId ? 1 : 0;
  });
  return out;
}

function notifyClients(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      /* ignore broken pipe */
    }
  }
}

/** จับคู่ยอดเงินเข้ากับ pending orders (ยอดตรง + trans_id ใหม่กว่า baseline + LIFO: QR ใหม่สุดก่อน) */
export async function checkPayments(): Promise<PromptPayOrder[]> {
  cleanupOrders();
  let transactions: PaynoiTransaction[];
  try {
    transactions = await fetchPaynoiTransactions();
  } catch (err) {
    console.error('❌ Paynoi fetch error:', (err as Error).message);
    return [];
  }

  const pending = [...orders.values()]
    .filter((o) => o.status === 'pending')
    .sort((a, b) => b.createdAt - a.createdAt);
  if (pending.length === 0) return [];

  const matched: PromptPayOrder[] = [];
  for (const tx of transactions) {
    if (usedTransIds.has(tx.transId)) continue;
    const order = pending.find(
      (o) =>
        o.status === 'pending' &&
        Math.abs(o.amount - tx.amount) < 0.01 &&
        compareTransId(tx.transId, o.baselineTransId)
    );
    if (order) {
      order.status = 'paid';
      order.payment = tx;
      usedTransIds.add(tx.transId);
      matched.push(order);
      notifyClients('payment_success', {
        transactionId: order.transactionId,
        amount: order.amount,
        senderName: tx.senderName,
        time: tx.time,
      });
      console.log(`✅ Payment matched: ${order.transactionId} = ${order.amount} บาท`);
    }
  }
  return matched;
}

/** สร้าง QR ตามยอด — ดึงรูปจาก Paynoi API เหมือน Topup-Kbank */
export async function createQrOrder(amount: number): Promise<{
  amount: number;
  qrCode: string;
  transactionId: string;
  expiresAt: number;
}> {
  if (!amount || amount <= 0 || !Number.isFinite(amount)) {
    throw new Error('กรุณาระบุจำนวนเงินให้ถูกต้อง');
  }
  const phoneNumber = env.PROMPTPAY_PHONE;
  if (!phoneNumber) throw new Error('PROMPTPAY_PHONE ยังไม่ได้ตั้งค่าใน .env');

  const qrUrl = `https://promptpay.paynoi.com/api.php?id=${phoneNumber}&amount=${amount}`;
  const response = await axios.get(qrUrl, { responseType: 'arraybuffer', timeout: 30000 });
  const qrBase64 = Buffer.from(response.data as ArrayBuffer).toString('base64');
  const qrImage = `data:image/png;base64,${qrBase64}`;

  // baseline: trans_id ล่าสุด "ก่อน" สร้าง QR — เงินเข้าที่ใหม่กว่านี้เท่านั้นถึงนับ
  let baselineTransId: string | null = null;
  try {
    const existing = await fetchPaynoiTransactions();
    if (existing.length > 0) baselineTransId = existing[0].transId;
  } catch (err) {
    console.warn('⚠️ ดึง baseline จาก Paynoi ไม่ได้:', (err as Error).message);
  }

  const transactionId = Date.now().toString(36).toUpperCase();
  // ยกเลิก QR เก่าที่ยังค้าง (กัน order ผีแย่งยอดกับ QR บนจอ)
  for (const [id, o] of orders) {
    if (o.status === 'pending') {
      orders.delete(id);
      notifyClients('order_expired', { transactionId: id });
    }
  }
  orders.set(transactionId, {
    transactionId,
    amount,
    status: 'pending',
    createdAt: Date.now(),
    baselineTransId,
    payment: null,
  });
  cleanupOrders();

  const expiresAt = Date.now() + ORDER_TTL_MS;
  return { amount, qrCode: qrImage, transactionId, expiresAt };
}

/** ดึงสถานะ order พร้อมเช็ก Paynoi รอบล่าสุด */
export async function getOrderStatus(transactionId: string): Promise<PromptPayOrder | null> {
  const order = orders.get(transactionId) || null;
  if (order && order.status === 'pending') {
    await checkPayments();
  }
  return orders.get(transactionId) || null;
}

/** ใช้โดย checkout — ยืนยันว่า order จ่ายแล้ว + ยอดตรง แล้ว mark กันใช้ซ้ำ */
export async function verifyAndConsumeOrder(
  transactionId: string,
  expectedAmount: number
): Promise<{ ok: boolean; message: string }> {
  const order = await getOrderStatus(transactionId);
  if (!order) return { ok: false, message: 'ไม่พบรายการ QR นี้ (อาจหมดอายุ)' };
  if (order.status !== 'paid') return { ok: false, message: 'ยังไม่พบยอดโอนสำหรับ QR นี้' };
  if (Math.abs(order.amount - expectedAmount) >= 0.01) {
    return { ok: false, message: 'ยอดที่โอนไม่ตรงกับยอดบิล' };
  }
  orders.delete(transactionId); // กันใช้ซ้ำ
  return { ok: true, message: 'ยืนยันการโอนแล้ว' };
}

export function cleanupOrders(): void {
  const now = Date.now();
  for (const [id, order] of orders) {
    if (now - order.createdAt > ORDER_TTL_MS) {
      orders.delete(id);
      notifyClients('order_expired', { transactionId: id });
    }
  }
}

export function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  if (!env.PAYNOI_RECORD_KEY || !signature) return false;
  const expected = crypto.createHmac('sha256', env.PAYNOI_RECORD_KEY).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function addSseClient(client: SseClient): void {
  sseClients.add(client);
}

export function removeSseClient(client: SseClient): void {
  sseClients.delete(client);
}

export function isPaynoiConfigured(): boolean {
  return Boolean(env.PAYNOI_API_KEY && env.PAYNOI_RECORD_KEY && env.PROMPTPAY_PHONE);
}

let autoCheckTimer: NodeJS.Timeout | null = null;

/** auto-check ทุก 10 วิ เหมือน Topup-Kbank (cron ทุก 10 วินาที) */
export function startAutoCheck(): void {
  if (autoCheckTimer || !isPaynoiConfigured()) return;
  autoCheckTimer = setInterval(() => {
    checkPayments().catch((err) => console.error('auto-check error:', (err as Error).message));
  }, AUTO_CHECK_INTERVAL_MS);
  console.log('🔁 PromptPay auto-check ทุก 10 วินาที');
}
