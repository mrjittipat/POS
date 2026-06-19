/**
 * Barcode Utility Functions
 * สร้างและจัดการบาร์โค้ด
 */

// Generate EAN-13 barcode
export function generateBarcode(): string {
  // Generate 12 digits (13th is check digit)
  let code = '885'; // Thailand country code

  for (let i = 0; i < 9; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }

  // Calculate check digit
  const checkDigit = calculateEAN13CheckDigit(code);
  return code + checkDigit.toString();
}

// Calculate EAN-13 check digit
function calculateEAN13CheckDigit(code: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

// Validate EAN-13 barcode
export function validateBarcode(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;

  const expectedCheck = calculateEAN13CheckDigit(code.slice(0, 12));
  const actualCheck = parseInt(code[12], 10);

  return expectedCheck === actualCheck;
}

// Generate transaction code
export function generateTransactionCode(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TXN${date}${time}${random}`;
}
