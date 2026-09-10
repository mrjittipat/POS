import api from './axios';

export interface PromptPayQrData {
  amount: number;
  qrCode: string;
  transactionId: string;
  expiresAt: number;
  paynoiConfigured?: boolean;
}

export type PromptPayStatus = 'pending' | 'paid';

export interface PromptPayPayment {
  date: string;
  time: string;
  datetime: string;
  amount: number;
  transId: string;
}

export interface PromptPayOrderState {
  transactionId: string;
  amount: number;
  status: PromptPayStatus;
  payment: PromptPayPayment | null;
}

/** สร้าง QR ตามยอด — POST /api/promptpay/create-qr */
export async function createPromptPayQr(amount: number): Promise<PromptPayQrData> {
  const res = await api.post('/promptpay/create-qr', { amount });
  return res.data.data as PromptPayQrData;
}

/** ถามสถานะ order — GET /api/promptpay/order-status/:id */
export async function getPromptPayStatus(transactionId: string): Promise<PromptPayOrderState> {
  const res = await api.get(`/promptpay/order-status/${transactionId}`);
  return res.data.data as PromptPayOrderState;
}

/** URL ของ SSE stream (แนบ token ผ่าน query เพราะ EventSource ส่ง header ไม่ได้) */
export function promptPayEventsUrl(): string {
  const token = localStorage.getItem('accessToken') || '';
  return `/api/promptpay/events?token=${encodeURIComponent(token)}`;
}
