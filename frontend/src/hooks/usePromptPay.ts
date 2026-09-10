import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createPromptPayQr,
  getPromptPayStatus,
  promptPayEventsUrl,
  type PromptPayQrData,
  type PromptPayStatus,
} from '../api/promptpay.api';

export interface UsePromptPay {
  qr: PromptPayQrData | null;
  status: PromptPayStatus | null;
  loading: boolean;
  error: string | null;
  start: (amount: number) => Promise<void>;
  reset: () => void;
}

/**
 * usePromptPay — โฟลว์ QR แบบ Topup-Kbank:
 * สร้าง QR ตามยอด → poll สถานะทุก 5 วิ + ฟัง SSE → ได้ paid เมื่อลูกค้าโอนแล้ว
 */
export function usePromptPay(options?: { onPaid?: (transactionId: string) => void }): UsePromptPay {
  const onPaid = options?.onPaid;
  const [qr, setQr] = useState<PromptPayQrData | null>(null);
  const [status, setStatus] = useState<PromptPayStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const txRef = useRef<string | null>(null);
  const paidRef = useRef(false);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  const reset = useCallback(() => {
    txRef.current = null;
    paidRef.current = false;
    setQr(null);
    setStatus(null);
    setError(null);
    setLoading(false);
  }, []);

  const start = useCallback(async (amount: number) => {
    setLoading(true);
    setError(null);
    paidRef.current = false;
    try {
      const data = await createPromptPayQr(amount);
      txRef.current = data.transactionId;
      setQr(data);
      setStatus('pending');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'สร้าง QR ไม่สำเร็จ';
      setError(msg);
      setQr(null);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling ทุก 5 วิเมื่อมี order pending
  useEffect(() => {
    if (!qr || status !== 'pending' || paidRef.current) return;
    const txId = qr.transactionId;
    const timer = setInterval(async () => {
      try {
        const s = await getPromptPayStatus(txId);
        if (txRef.current !== txId) return;
        setStatus(s.status);
        if (s.status === 'paid' && !paidRef.current) {
          paidRef.current = true;
          clearInterval(timer);
          onPaidRef.current?.(txId);
        }
      } catch {
        /* เงียบไว้ รอรอบถัดไป */
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [qr, status]);

  // SSE: ฟัง event จ่ายสำเร็จแบบเรียลไทม์
  useEffect(() => {
    const es = new EventSource(promptPayEventsUrl());
    es.addEventListener('payment_success', ((ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data) as { transactionId?: string };
        if (payload.transactionId && payload.transactionId === txRef.current && !paidRef.current) {
          paidRef.current = true;
          setStatus('paid');
          onPaidRef.current?.(payload.transactionId);
        }
      } catch {
        /* payload ผิดรูป — ข้าม */
      }
    }) as EventListener);
    return () => es.close();
  }, []);

  return { qr, status, loading, error, start, reset };
}
