// User roles
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
} as const;

// Role display names (Thai)
export const ROLE_NAMES: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ',
  manager: 'ผู้จัดการ',
  cashier: 'พนักงานขาย',
};

// Payment methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  PROMPTPAY: 'promptpay',
  TRANSFER: 'transfer',
  CREDIT_CARD: 'credit_card',
} as const;

// Payment method display names (Thai)
export const PAYMENT_NAMES: Record<string, string> = {
  cash: 'เงินสด',
  promptpay: 'QR PromptPay',
  transfer: 'โอนเงิน',
  credit_card: 'บัตรเครดิต',
};

// Transaction status
export const TRANSACTION_STATUS = {
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export const STATUS_NAMES: Record<string, string> = {
  completed: 'สำเร็จ',
  cancelled: 'ยกเลิก',
  refunded: 'คืนเงิน',
};

// Inventory log types
export const INVENTORY_TYPES = {
  IN: 'in',
  OUT: 'out',
  ADJUSTMENT: 'adjustment',
} as const;

export const INVENTORY_TYPE_NAMES: Record<string, string> = {
  in: 'รับเข้า',
  out: 'ตัดออก',
  adjustment: 'ปรับยอด',
};
