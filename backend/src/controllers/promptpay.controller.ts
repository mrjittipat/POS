import { Request, Response } from 'express';
import {
  createQrOrder,
  getOrderStatus,
  checkPayments,
  verifyWebhookSignature,
  addSseClient,
  removeSseClient,
  isPaynoiConfigured,
} from '../services/promptpay.service';

/**
 * PromptPay Controller
 * POST /api/promptpay/create-qr | GET /api/promptpay/order-status | GET /api/promptpay/events | POST /api/promptpay/webhook
 */

export async function createQR(req: Request, res: Response): Promise<void> {
  try {
    const amount = parseFloat(req.body.amount);
    const data = await createQrOrder(amount);
    res.json({ success: true, data });
  } catch (error) {
    const message = (error as Error).message;
    const status = /จำนวนเงิน/.test(message) ? 400 : 502;
    res.status(status).json({ success: false, message });
  }
}

export async function orderStatus(req: Request, res: Response): Promise<void> {
  const transactionId = String(req.query.transactionId || '');
  if (!transactionId) {
    res.status(400).json({ success: false, message: 'กรุณาระบุ transactionId' });
    return;
  }
  const order = await getOrderStatus(transactionId);
  if (!order) {
    res.status(404).json({ success: false, message: 'ไม่พบรายการ (อาจหมดอายุ)' });
    return;
  }
  res.json({
    success: true,
    data: {
      transactionId: order.transactionId,
      amount: order.amount,
      status: order.status,
      payment: order.payment
        ? {
            senderName: order.payment.senderName,
            time: order.payment.time,
            transId: order.payment.transId,
          }
        : null,
    },
  });
}

export async function checkNow(_req: Request, res: Response): Promise<void> {
  const matched = await checkPayments();
  res.json({ success: true, data: { matched: matched.length } });
}

export function events(req: Request, res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const keepAlive = setInterval(() => res.write(': keep-alive\n\n'), 30000);
  const client = { write: (chunk: string) => res.write(chunk) };
  addSseClient(client);

  req.on('close', () => {
    clearInterval(keepAlive);
    removeSseClient(client);
  });
}

/** Webhook จาก Paynoi — verify HMAC แล้ว trigger checkPayments */
export async function webhook(req: Request, res: Response): Promise<void> {
  try {
    const rawBody = (req as Request & { rawBody?: string }).rawBody || JSON.stringify(req.body || {});
    const signature = req.headers['x-paynoi-signature'] as string | undefined;

    if (signature && !verifyWebhookSignature(rawBody, signature)) {
      res.status(401).json({ success: false, message: 'Invalid signature' });
      return;
    }

    console.log('📩 Paynoi webhook received');
    await checkPayments();
    res.json({ success: true });
  } catch (error) {
    console.error('webhook error:', (error as Error).message);
    res.status(500).json({ success: false, message: 'Webhook error' });
  }
}

export function paynoiStatus(_req: Request, res: Response): void {
  res.json({ success: true, data: { configured: isPaynoiConfigured() } });
}
