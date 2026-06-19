import { Request, Response } from 'express';
import * as barcodeService from '../services/barcode.service';

// POST /api/barcode/generate
export async function generateBarcode(req: Request, res: Response): Promise<void> {
  try {
    const code = barcodeService.generateNewBarcode();
    res.json({ success: true, data: { barcode: code } });
  } catch (error) {
    console.error('Generate barcode error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}

// GET /api/barcode/validate/:code
export async function validateBarcode(req: Request, res: Response): Promise<void> {
  try {
    const isValid = barcodeService.validateBarcodeFormat(req.params.code);
    res.json({ success: true, data: { valid: isValid } });
  } catch (error) {
    console.error('Validate barcode error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}
