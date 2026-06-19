import PDFDocument from 'pdfkit';
import { Transaction, TransactionItem, Payment, Setting } from '../models/types';

/**
 * Receipt PDF Generator
 * สร้างใบเสร็จรับเงินเป็น PDF
 */

interface ReceiptData {
  transaction: Transaction;
  items: TransactionItem[];
  payments: Payment[];
  settings: Setting[];
}

// Get setting value by key
function getSetting(settings: Setting[], key: string): string {
  const setting = settings.find((s) => s.key === key);
  return setting?.value || '';
}

// Generate receipt PDF (returns Buffer)
export function generateReceiptPDF(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const { transaction, items, payments, settings } = data;
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const storeName = getSetting(settings, 'store_name') || 'ร้านค้า POS System';
    const storeAddress = getSetting(settings, 'store_address') || '';
    const storePhone = getSetting(settings, 'store_phone') || '';
    const taxId = getSetting(settings, 'tax_id') || '';
    const receiptFooter = getSetting(settings, 'receipt_footer') || 'ขอบคุณที่ใช้บริการ';

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text(storeName, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(storeAddress, { align: 'center' });
    if (storePhone) doc.text(`โทร: ${storePhone}`, { align: 'center' });
    if (taxId) doc.text(`เลขประจำตัวผู้เสียภาษี: ${taxId}`, { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').text('ใบเสร็จรับเงิน', { align: 'center' });
    doc.moveDown(0.5);

    // Transaction info
    doc.fontSize(9).font('Helvetica');
    doc.text(`เลขที่: ${transaction.transaction_code}`);
    doc.text(`วันที่: ${new Date(transaction.created_at).toLocaleString('th-TH')}`);
    doc.text(`สถานะ: ${transaction.status === 'completed' ? 'สำเร็จ' : transaction.status}`);

    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);

    // Items header
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('รายการ', 40);
    doc.text('จำนวน', 300);
    doc.text('ราคา/หน่วย', 370);
    doc.text('รวม', 470);
    doc.moveDown(0.3);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.3);

    // Items
    doc.font('Helvetica');
    for (const item of items) {
      doc.text(item.product_name.substring(0, 40), 40);
      doc.text(item.quantity.toString(), 300);
      doc.text(`฿${item.unit_price.toFixed(2)}`, 370);
      doc.text(`฿${item.subtotal.toFixed(2)}`, 470);
      doc.moveDown(0.3);
    }

    doc.moveDown(0.3);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);

    // Totals
    doc.fontSize(9).font('Helvetica');
    doc.text(`ยอดรวม:`, 350);
    doc.text(`฿${transaction.total_amount.toFixed(2)}`, 470);

    if (transaction.discount_amount > 0) {
      doc.text(`ส่วนลด:`, 350);
      doc.text(`-฿${transaction.discount_amount.toFixed(2)}`, 470);
    }

    doc.text(`ภาษี VAT ${transaction.vat_rate}%:`, 350);
    doc.text(`฿${transaction.vat_amount.toFixed(2)}`, 470);

    doc.moveDown(0.3);
    doc.font('Helvetica-Bold');
    doc.text(`ยอดสุทธิ:`, 350);
    doc.text(`฿${transaction.net_amount.toFixed(2)}`, 470);

    // Payments
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(9);
    doc.text('การชำระเงิน:');
    for (const payment of payments) {
      const methodNames: Record<string, string> = {
        cash: 'เงินสด',
        promptpay: 'QR PromptPay',
        transfer: 'โอนเงิน',
        credit_card: 'บัตรเครดิต',
      };
      doc.text(`  ${methodNames[payment.method] || payment.method}: ฿${payment.amount.toFixed(2)}`);
    }

    // Footer
    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica').text(receiptFooter, { align: 'center' });

    doc.end();
  });
}
