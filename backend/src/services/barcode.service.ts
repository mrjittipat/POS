import { generateBarcode, validateBarcode } from '../utils/barcode.util';

/**
 * Barcode Service
 * จัดการบาร์โค้ดสินค้า
 */

// Generate new barcode
export function generateNewBarcode(): string {
  return generateBarcode();
}

// Validate barcode format
export function validateBarcodeFormat(code: string): boolean {
  return validateBarcode(code);
}

// Generate barcode as SVG data URL (for frontend rendering)
export function generateBarcodeSVG(code: string): string {
  // Simple Code 128 representation for frontend
  // In production, use a proper barcode library
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><text x="10" y="35" font-family="monospace" font-size="14">${code}</text></svg>`)}`;
}
