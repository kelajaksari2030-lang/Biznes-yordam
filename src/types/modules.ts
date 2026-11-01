/**
 * BiznesYordam - Extended Modules Type Definitions
 * Covers:
 * 1. Suppliers & Purchasing (Ta'minotchilar va Xaridlar)
 * 2. Staff & KPI (Xodimlar, Rollar, Smenalar, Komissiya)
 * 3. Telegram Integration & Notifications
 * 4. Customer Loyalty & Cashback
 * 5. Multi-branch & Multi-warehouse (Filiallar va Omborlar)
 * 6. Barcode & Thermal Printing (Shtrix-kod va Chop etish)
 * 7. System & Business Settings
 */

export interface Supplier {
  id: string;
  userId: string;
  name: string;
  contactPerson?: string;
  phone: string;
  companyName?: string;
  address?: string;
  balancePayable: number; // Current unpaid balance owed to supplier (UZS)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  unit?: string;
}

export interface PurchaseOrder {
  id: string;
  userId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  paidAmount: number;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid';
  receivedAt?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type StaffRole = 'admin' | 'manager' | 'cashier' | 'accountant';

export interface StaffMember {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone: string;
  role: StaffRole;
  pinCode?: string; // 4-digit PIN for quick cashier auth
  commissionRatePercent: number; // E.g., 2% per sale
  totalCommissionEarned: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffShift {
  id: string;
  userId: string;
  staffId: string;
  staffName: string;
  role: StaffRole;
  startTime: string;
  endTime?: string | null;
  initialCash: number;
  cashCollected: number;
  cardCollected: number;
  totalSales: number;
  ordersCount: number;
  actualCash?: number;
  discrepancy?: number;
  status: 'open' | 'closed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramConfig {
  botToken: string; // Token kept safely
  chatId: string;
  enabled: boolean;
  notifyLowStock: boolean;
  notifyHighSale: boolean;
  highSaleThresholdUZS: number;
  notifyDailyReport: boolean;
  dailyReportTime?: string;
  updatedAt: string;
}

export type CustomerTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface LoyaltyConfig {
  enabled: boolean;
  cashbackPercent: number; // E.g. 2%
  redemptionRateUZSPerPoint: number; // 1 point = 1 UZS
  silverThresholdUZS: number; // Minimum lifetime spend to reach Silver
  goldThresholdUZS: number;   // Minimum spend for Gold
  platinumThresholdUZS: number; // Minimum spend for Platinum
  silverCashbackBonusPercent: number;
  goldCashbackBonusPercent: number;
  platinumCashbackBonusPercent: number;
  updatedAt: string;
}

export interface LoyaltyLedgerItem {
  id: string;
  userId: string;
  customerId: string;
  customerName: string;
  orderId?: string;
  type: 'earned' | 'redeemed';
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface Branch {
  id: string;
  userId: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isMain: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Warehouse {
  id: string;
  userId: string;
  branchId: string;
  name: string;
  code: string;
  address?: string;
  isMain: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockTransferItem {
  productId: string;
  productName: string;
  quantity: number;
  unit?: string;
}

export interface StockTransfer {
  id: string;
  userId: string;
  transferNumber: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  destWarehouseId: string;
  destWarehouseName: string;
  items: StockTransferItem[];
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
  requestedByStaffId?: string;
  confirmedByStaffId?: string;
  notes?: string;
  createdAt: string;
  completedAt?: string | null;
  updatedAt: string;
}

export type ThermalReceiptWidth = '58mm' | '80mm';

export interface PrinterConfig {
  receiptWidth: ThermalReceiptWidth;
  headerText: string;
  footerText: string;
  showQrCode: boolean;
  showLoyaltyPoints: boolean;
  autoPrintAfterSale: boolean;
}

export interface AppSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'emerald';
  reducedMotion: boolean;
  currency: 'UZS' | 'USD';
  timezone: string;
  taxPercent: number;
  receiptText: string;
  printerConfig: PrinterConfig;
  telegramConfig: TelegramConfig;
  loyaltyConfig: LoyaltyConfig;
  updatedAt: string;
}
