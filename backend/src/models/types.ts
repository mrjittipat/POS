// User roles
export type UserRole = 'admin' | 'manager' | 'cashier';

// User model
export interface User {
  id: number;
  username: string;
  password: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Category model
export interface Category {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Product model
export interface Product {
  id: number;
  category_id: number | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  image_url: string | null;
  price: number;
  cost: number;
  unit: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

// Inventory model
export interface Inventory {
  id: number;
  product_id: number;
  quantity: number;
  min_stock: number;
  location: string | null;
  updated_at: Date;
}

// Transaction model
export interface Transaction {
  id: number;
  transaction_code: string;
  user_id: number;
  total_amount: number;
  discount_amount: number;
  discount_type: 'percent' | 'fixed';
  vat_amount: number;
  vat_rate: number;
  net_amount: number;
  status: 'completed' | 'cancelled' | 'refunded';
  cancel_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

// Transaction item model
export interface TransactionItem {
  id: number;
  transaction_id: number;
  product_id: number;
  product_name: string;
  barcode: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
  created_at: Date;
}

// Payment model
export type PaymentMethod = 'cash' | 'promptpay' | 'transfer' | 'credit_card';

export interface Payment {
  id: number;
  transaction_id: number;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
  created_at: Date;
}

// Inventory log model
export interface InventoryLog {
  id: number;
  product_id: number;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  before_qty: number;
  after_qty: number;
  reason: string | null;
  user_id: number | null;
  created_at: Date;
}

// Setting model
export interface Setting {
  id: number;
  key: string;
  value: string | null;
  description: string | null;
  updated_at: Date;
}

// JWT Payload
export interface JwtPayload {
  userId: number;
  username: string;
  role: UserRole;
}

// Auth tokens
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Cart item for POS
export interface CartItem {
  product_id: number;
  product_name: string;
  barcode: string | null;
  price: number;
  quantity: number;
  discount: number;
  subtotal: number;
}

// Checkout request
export interface CheckoutRequest {
  items: CartItem[];
  discount_amount: number;
  discount_type: 'percent' | 'fixed';
  vat_rate: number;
  payments: {
    method: PaymentMethod;
    amount: number;
    reference?: string;
  }[];
}

// API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Paginated response
export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Dashboard stats
export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  totalProducts: number;
  lowStockCount: number;
  salesChart: { date: string; amount: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
}

// Report filters
export interface ReportFilter {
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'month' | 'year';
}
