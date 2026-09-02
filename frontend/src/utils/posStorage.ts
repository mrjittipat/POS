import type { CartItem } from '../api/pos.api';

export interface ParkedBill {
  id: string;
  label: string;
  items: CartItem[];
  total: number;
  at: string; // ISO timestamp
}

export interface DrawerLog {
  id: string;
  type: 'in' | 'out';
  amount: number;
  note: string;
  at: string;
  refCode?: string; // เลข transaction ที่ทำให้เงินเข้า/ออก (สำหรับลบเฉพาะรายการตามบิล)
}

export interface DrawerState {
  balance: number;
  logs: DrawerLog[];
}

const PARKED_KEY = 'pos_parked_bills';
const DRAWER_KEY = 'pos_drawer';

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// --- Parked bills ---
export function getParkedBills(): ParkedBill[] {
  return readJSON<ParkedBill[]>(PARKED_KEY, []);
}

export function saveParkedBill(bill: ParkedBill) {
  const bills = getParkedBills();
  writeJSON(PARKED_KEY, [bill, ...bills]);
}

export function removeParkedBill(id: string) {
  writeJSON(
    PARKED_KEY,
    getParkedBills().filter((b) => b.id !== id)
  );
}

// --- Drawer money ---
export function getDrawerState(): DrawerState {
  return readJSON<DrawerState>(DRAWER_KEY, { balance: 0, logs: [] });
}

export function addDrawerLog(type: 'in' | 'out', amount: number, note: string, refCode?: string): DrawerState {
  const state = getDrawerState();
  const log: DrawerLog = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    amount,
    note,
    at: new Date().toISOString(),
    ...(refCode ? { refCode } : {}),
  };
  const balance =
    type === 'in' ? state.balance + amount : Math.max(0, state.balance - amount);
  const updated: DrawerState = {
    balance,
    logs: [log, ...state.logs],
  };
  writeJSON(DRAWER_KEY, updated);
  return updated;
}

export function removeDrawerLog(id: string): DrawerState {
  const state = getDrawerState();
  const updated: DrawerState = {
    balance: state.balance, // ลบประวัติเท่านั้น ไม่กระทบเงินในลิ้นชัก
    logs: state.logs.filter((l) => l.id !== id),
  };
  writeJSON(DRAWER_KEY, updated);
  return updated;
}

// ลบรายการเงินพักตามเลข transaction ที่กำหนด (ใช้เมื่อรีเซ็ตยอดขาย)
// — ลบเฉพาะรายการของบิลที่ถูกรีเซ็ต และหักยอดเงินออกตามบิลแต่ละรายการ
export function removeDrawerLogsByRef(
  codes: string[]
): { state: DrawerState; removedCount: number; removedAmount: number } {
  const state = getDrawerState();
  const set = new Set(codes.filter(Boolean));
  if (set.size === 0) return { state, removedCount: 0, removedAmount: 0 };

  const removedLogs = state.logs.filter((l) => l.refCode && set.has(l.refCode));
  if (removedLogs.length === 0) return { state, removedCount: 0, removedAmount: 0 };

  let removedAmount = 0;
  for (const l of removedLogs) {
    removedAmount += l.type === 'in' ? l.amount : -l.amount;
  }

  const kept = state.logs.filter((l) => !removedLogs.includes(l));
  const updated: DrawerState = {
    balance: Math.max(0, state.balance - removedAmount),
    logs: kept,
  };
  writeJSON(DRAWER_KEY, updated);
  return { state: updated, removedCount: removedLogs.length, removedAmount };
}

export function resetDrawerState(): DrawerState {
  const empty: DrawerState = { balance: 0, logs: [] };
  writeJSON(DRAWER_KEY, empty);
  return empty;
}

// Clean up parked bills when products are deleted
export function cleanupParkedBillsByProductIds(deletedProductIds: number[]): { removedBills: number; cleanedBills: number } {
  const bills = getParkedBills();
  const idSet = new Set(deletedProductIds);

  let removedBills = 0;
  let cleanedBills = 0;
  const updated: ParkedBill[] = [];

  for (const bill of bills) {
    // Remove deleted products from this bill
    const remainingItems = bill.items.filter(item => !idSet.has(item.product_id));

    // If no items left, skip this bill entirely (it will be deleted)
    if (remainingItems.length === 0) {
      removedBills++;
      continue;
    }

    // If some items were removed, recalculate total
    if (remainingItems.length < bill.items.length) {
      cleanedBills++;
      const newTotal = remainingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      updated.push({
        ...bill,
        items: remainingItems,
        total: newTotal,
      });
    } else {
      // No items removed from this bill
      updated.push(bill);
    }
  }

  writeJSON(PARKED_KEY, updated);
  return { removedBills, cleanedBills };
}

// หักเงินออกจากกล่องลิ้นชัก (เช่น ใช้เมื่อรีเซ็ตยอดขาย เพื่อหักเงินสดที่ได้จากการขายที่ถูกรีเซ็ต)
export function deductDrawerMoney(amount: number, note: string): DrawerState {
  const state = getDrawerState();
  const log: DrawerLog = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'out',
    amount,
    note,
    at: new Date().toISOString(),
  };
  const updated: DrawerState = {
    balance: Math.max(0, state.balance - amount),
    logs: [log, ...state.logs],
  };
  writeJSON(DRAWER_KEY, updated);
  return updated;
}
