/**
 * BiznesYordam - Unified Business Platform Data Models
 * Types for BusinessProfile, CRM (Customer), Inventory (Product),
 * Sales Orders, Financial Transactions, Marketing Campaigns, and Business Tasks.
 * 
 * Strict User ID scoping guarantees multi-tenant isolation.
 */

export type SalesChannel = 'telegram' | 'instagram' | 'tiktok' | 'offline' | 'website' | 'other';
export type BusinessCurrency = 'UZS' | 'USD';

/**
 * Single source of truth for the entrepreneur's business.
 * Shared across AI Diagnostics, Ad Lab, Today Navigator, CRM, and Inventory.
 * Stored at: /users/{userId}/businessProfile/main
 */
export interface BusinessProfile {
  userId: string;
  companyName: string;
  category: string;
  targetAudience: string;
  mainSalesChannels: SalesChannel[];
  currency: BusinessCurrency;
  cityOrRegion?: string;
  description?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export type BusinessProfileInput = Omit<BusinessProfile, 'createdAt' | 'updatedAt' | 'userId'> & {
  userId?: string;
};

/**
 * CRM Customer Entity
 * Stored at: /users/{userId}/customers/{customerId}
 */
export type CustomerStatus = 'lead' | 'active' | 'vip' | 'inactive';

export interface Customer {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  telegramUsername?: string;
  status: CustomerStatus;
  totalOrdersCount: number;
  totalSpent: number; // in business currency (e.g., UZS)
  lastOrderAt?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Inventory & Ombor Product Entity
 * Stored at: /users/{userId}/products/{productId}
 */
export type ProductUnit = 'dona' | 'kg' | 'metr' | 'komplekt' | 'xizmat';

export interface Product {
  id: string;
  userId: string;
  name: string;
  sku?: string;
  category?: string;
  purchaseCost: number; // Tannarx (purchase/production cost)
  sellingPrice: number; // Sotish narxi
  stockQuantity: number; // Mavjud ombor qoldig'i
  minStockThreshold: number; // Kam qolganlik chegarasi (ogohlantirish uchun)
  unit: ProductUnit;
  isDeadStock?: boolean; // Harakatsiz qolib ketgan tovar (flesh-taklif yoki navigator uchun)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sales Order Entity
 * Stored at: /users/{userId}/orders/{orderId}
 * (Distinct from top-level /orders for Click subscription payments)
 */
export type OrderStatus = 'draft' | 'confirmed' | 'delivered' | 'cancelled';
export type OrderPaymentStatus = 'unpaid' | 'partially_paid' | 'paid';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number; // Snapshot of selling price at order creation time
  unitCost: number;  // Snapshot of purchase cost at order creation time
  unit?: string;
  totalPrice: number; // quantity * unitPrice
  totalCost: number;  // quantity * unitCost
}

export interface Order {
  id: string;
  userId: string;
  orderNumber?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
  totalAmount: number;
  totalCost: number;
  totalProfit: number;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  paidAmount?: number; // Actual collected payment amount in currency
  stockDeducted: boolean; // Tracks whether inventory quantities were deducted atomically
  idempotencyKey?: string; // Prevents duplicate ledger entries & inventory deductions
  notes?: string;
  createdAt: string;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  deliveredAt?: string | null;
  updatedAt: string;
}

/**
 * Financial Ledger Transaction Entity
 * Stored at: /users/{userId}/transactions/{transactionId}
 */
export type TransactionType = 'income' | 'expense';
export type ExpenseCategory =
  | 'ijara'
  | 'reklama'
  | 'transport'
  | 'ish_haqi'
  | 'mahsulot_xaridi'
  | 'kommunal'
  | 'boshqa';

export type TransactionCategory =
  | ExpenseCategory
  | 'sales'
  | 'tax'
  | 'other';

export interface FinancialTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description?: string;
  relatedOrderId?: string;
  idempotencyKey?: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt?: string;
}

export type ExpenseTransactionInput = Omit<FinancialTransaction, 'id' | 'createdAt' | 'updatedAt' | 'userId'>;

/**
 * Marketing Campaign & A/B Experiment Entity
 * Stored at: /users/{userId}/marketingCampaigns/{campaignId}
 */
export type CampaignPlatform = 'instagram' | 'telegram' | 'tiktok' | 'other';
export type CampaignObjective = 'sales' | 'leads' | 'followers' | 'brand_awareness';

export interface MarketingCampaign {
  id: string;
  userId: string;
  title: string;
  platform: CampaignPlatform;
  objective: CampaignObjective;
  productId?: string;
  targetAudience: string;
  budgetPlanned?: number;
  budgetSpent?: number;
  activeStrategyId?: string;
  strategiesSnapshot?: any[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Unified Business Task Entity
 * Stored at: /users/{userId}/businessTasks/{taskId}
 */
export type TaskSource = 'today_navigator' | 'business_diagnostics' | 'manual';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface BusinessTask {
  id: string;
  userId: string;
  title: string;
  description: string;
  source: TaskSource;
  priority: TaskPriority;
  estimatedMinutes: number;
  completed: boolean;
  completedAt?: string;
  dueDate: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}
