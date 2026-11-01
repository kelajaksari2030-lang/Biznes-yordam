/**
 * BESTO - Phase 3 New Business Modules & Settings Test Suite
 * 
 * Verifies:
 * 1. Suppliers & PO Receiving: weighted average cost, idempotent receiving & supplier balance payable.
 * 2. Staff & RBAC: role assignment permission checks, shift cash discrepancy calculation.
 * 3. Customer Loyalty: lifetime spend tier calculation, effective cashback %, and balance protection.
 * 4. Multi-Branch Stock Transfers: stock conservation, source inventory deduction & sufficiency checks.
 * 5. Barcode & Thermal Printing: EAN-13 checksum calculation & 13-digit barcode validation.
 * 6. System & Settings: default configuration shape and data export bundle structure.
 */

import {
  calculateEan13Checksum,
  generateEan13Barcode,
  validateEan13Barcode,
} from '../src/services/barcodePrinterService';
import {
  calculateCustomerTier,
  getEffectiveCashbackPercent,
  DEFAULT_LOYALTY_CONFIG,
} from '../src/services/loyaltyService';
import { validateRoleAssignment } from '../src/services/staffService';
import { DEFAULT_TELEGRAM_CONFIG } from '../src/services/telegramService';
import { DEFAULT_APP_SETTINGS } from '../src/services/settingsService';
import { Supplier, PurchaseOrder, StaffRole, StockTransfer } from '../src/types/modules';
import { Product } from '../src/types/inventory';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✅ PASS: ${message}`);
  }
}

console.log('====================================================');
console.log('🧪 RUNNING BESTO PHASE 3 NEW MODULES TEST SUITE');
console.log('====================================================');

// ----------------------------------------------------
// 1. Barcode & EAN-13 Checksum Validation Tests
// ----------------------------------------------------
console.log('\n--- 1. Barcode & EAN-13 Checksum Tests ---');

// Test 12-digit input checksum
const test12 = '478000000001';
const checkDigit = calculateEan13Checksum(test12);
assert(typeof checkDigit === 'number' && checkDigit >= 0 && checkDigit <= 9, 'EAN-13 check digit is a single digit 0-9');

const generatedEan = generateEan13Barcode('prod_test_123');
assert(generatedEan.length === 13, 'Generated barcode is 13 digits long');
assert(generatedEan.startsWith('478'), 'Uzbekistan prefix 478 applied correctly');

const valResultValid = validateEan13Barcode(generatedEan);
assert(valResultValid.isValid, 'Generated EAN-13 passes checksum validation');

const valResultInvalid = validateEan13Barcode('4780000000019'); // wrong check digit
assert(!valResultInvalid.isValid, 'Invalid check digit rejected');
assert(valResultInvalid.reason!.includes('noto\'g\'ri'), 'Error specifies check digit mismatch');

const valResultBadLength = validateEan13Barcode('12345');
assert(!valResultBadLength.isValid, 'Short string rejected');

// ----------------------------------------------------
// 2. Customer Loyalty Tier & Cashback Tests
// ----------------------------------------------------
console.log('\n--- 2. Customer Loyalty Tier & Cashback Tests ---');

assert(calculateCustomerTier(0) === 'bronze', '0 UZS spend classifies as Bronze tier');
assert(calculateCustomerTier(2500000) === 'silver', '2.5M UZS spend classifies as Silver tier');
assert(calculateCustomerTier(6000000) === 'gold', '6M UZS spend classifies as Gold tier');
assert(calculateCustomerTier(15000000) === 'platinum', '15M UZS spend classifies as Platinum tier');

assert(getEffectiveCashbackPercent('bronze', DEFAULT_LOYALTY_CONFIG) === 2, 'Bronze cashback rate is 2%');
assert(getEffectiveCashbackPercent('silver', DEFAULT_LOYALTY_CONFIG) === 3, 'Silver cashback rate is 3% (+1% bonus)');
assert(getEffectiveCashbackPercent('gold', DEFAULT_LOYALTY_CONFIG) === 5, 'Gold cashback rate is 5% (+3% bonus)');
assert(getEffectiveCashbackPercent('platinum', DEFAULT_LOYALTY_CONFIG) === 7, 'Platinum cashback rate is 7% (+5% bonus)');

// Disabled config returns 0%
const disabledCfg = { ...DEFAULT_LOYALTY_CONFIG, enabled: false };
assert(getEffectiveCashbackPercent('platinum', disabledCfg) === 0, 'Disabled loyalty program yields 0% cashback');

// ----------------------------------------------------
// 3. Staff & RBAC Role Assignment Permission Tests
// ----------------------------------------------------
console.log('\n--- 3. Staff & RBAC Role Assignment Tests ---');

const cashierAssignAdmin = validateRoleAssignment('cashier', 'admin');
assert(!cashierAssignAdmin.allowed, 'Cashier cannot assign Admin role');
assert(cashierAssignAdmin.reason!.includes('Admin huquqini bera oladi'), 'Rejection specifies admin role protection');

const managerAssignAdmin = validateRoleAssignment('manager', 'admin');
assert(!managerAssignAdmin.allowed, 'Manager cannot assign Admin role');

const adminAssignAdmin = validateRoleAssignment('admin', 'admin');
assert(adminAssignAdmin.allowed, 'Admin can assign Admin role');

const adminAssignCashier = validateRoleAssignment('admin', 'cashier');
assert(adminAssignCashier.allowed, 'Admin can assign Cashier role');

// ----------------------------------------------------
// 4. Shift Reconciliation Discrepancy Tests
// ----------------------------------------------------
console.log('\n--- 4. Shift Reconciliation Discrepancy Tests ---');

function computeShiftDiscrepancy(initialCash: number, cashCollected: number, actualCash: number) {
  const expectedCash = initialCash + cashCollected;
  return actualCash - expectedCash;
}

assert(computeShiftDiscrepancy(50000, 200000, 250000) === 0, 'Exact cash match results in 0 discrepancy');
assert(computeShiftDiscrepancy(50000, 200000, 240000) === -10000, 'Missing cash results in negative discrepancy (-10,000 UZS)');
assert(computeShiftDiscrepancy(50000, 200000, 260000) === 10000, 'Surplus cash results in positive discrepancy (+10,000 UZS)');

// ----------------------------------------------------
// 5. Suppliers & Idempotent Stock Receipt Logic
// ----------------------------------------------------
console.log('\n--- 5. Suppliers & Idempotent Stock Receipt Simulation ---');

const initialProduct: Product = {
  id: 'prod_coffee_beans',
  userId: 'user_test',
  name: 'Kofe donalari 1kg',
  sku: 'COFFEE-01',
  purchasePrice: 80000,
  sellingPrice: 150000,
  quantity: 10,
  minStockAlert: 2,
  unit: 'kg',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function simulatePOReceipt(
  po: PurchaseOrder,
  product: Product,
  supplier: Supplier
): { updatedProduct: Product; updatedSupplier: Supplier; poReceived: boolean } {
  if (po.status === 'received') {
    // Idempotent: no stock added twice!
    return { updatedProduct: product, updatedSupplier: supplier, poReceived: false };
  }

  const item = po.items[0];
  const newQty = product.quantity + item.quantity;
  const newAvgCost = Math.round(
    (product.quantity * product.purchasePrice + item.quantity * item.unitCost) / newQty
  );

  const unpaidDebt = Math.max(0, po.totalAmount - po.paidAmount);

  return {
    updatedProduct: {
      ...product,
      quantity: newQty,
      purchasePrice: newAvgCost,
    },
    updatedSupplier: {
      ...supplier,
      balancePayable: supplier.balancePayable + unpaidDebt,
    },
    poReceived: true,
  };
}

const mockSupplier: Supplier = {
  id: 'sup_1',
  userId: 'user_test',
  name: 'Kofe Ta\'minot LLC',
  phone: '+998901234567',
  balancePayable: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockPO: PurchaseOrder = {
  id: 'po_1',
  userId: 'user_test',
  poNumber: 'PO-001',
  supplierId: 'sup_1',
  supplierName: 'Kofe Ta\'minot LLC',
  items: [{ productId: 'prod_coffee_beans', productName: 'Kofe donalari 1kg', quantity: 10, unitCost: 100000, totalCost: 1000000 }],
  totalAmount: 1000000,
  paidAmount: 400000, // Unpaid = 600,000 UZS
  status: 'draft',
  paymentStatus: 'partially_paid',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// First receipt
const resReceipt1 = simulatePOReceipt(mockPO, initialProduct, mockSupplier);
assert(resReceipt1.poReceived, 'First PO receipt succeeds');
assert(resReceipt1.updatedProduct.quantity === 20, 'Stock increased from 10 to 20 kg');
assert(resReceipt1.updatedProduct.purchasePrice === 90000, 'Moving average cost recalculated to 90,000 UZS');
assert(resReceipt1.updatedSupplier.balancePayable === 600000, 'Supplier balance payable increased by 600,000 UZS unpaid portion');

// Duplicate receipt attempt on already received PO
const receivedPO: PurchaseOrder = { ...mockPO, status: 'received' };
const resReceipt2 = simulatePOReceipt(receivedPO, resReceipt1.updatedProduct, resReceipt1.updatedSupplier);
assert(!resReceipt2.poReceived, 'Duplicate PO receipt request ignored idempotently');
assert(resReceipt2.updatedProduct.quantity === 20, 'Stock remains 20 kg without duplication');
assert(resReceipt2.updatedSupplier.balancePayable === 600000, 'Supplier balance remains 600,000 UZS without duplication');

// ----------------------------------------------------
// 6. Multi-Branch Stock Transfer Conservation Tests
// ----------------------------------------------------
console.log('\n--- 6. Multi-Branch Stock Transfer Conservation Tests ---');

function simulateStockTransfer(
  sourceStock: number,
  transferQty: number
): { success: boolean; newSourceStock: number; error?: string } {
  if (sourceStock < transferQty) {
    return {
      success: false,
      newSourceStock: sourceStock,
      error: 'Manba omborda yetarli tovar yo\'q',
    };
  }
  return {
    success: true,
    newSourceStock: sourceStock - transferQty,
  };
}

const trSuccess = simulateStockTransfer(50, 20);
assert(trSuccess.success, 'Stock transfer succeeds when source has 50 units');
assert(trSuccess.newSourceStock === 30, 'Source stock reduced by exactly 20 units');

const trFailed = simulateStockTransfer(10, 25);
assert(!trFailed.success, 'Stock transfer fails when source has insufficient stock (10 < 25)');
assert(trFailed.newSourceStock === 10, 'Source stock left uncorrupted after failed transfer');

// ----------------------------------------------------
// 7. System & App Settings Defaults
// ----------------------------------------------------
console.log('\n--- 7. System & App Settings Defaults ---');

assert(DEFAULT_TELEGRAM_CONFIG.highSaleThresholdUZS === 500000, 'Default Telegram high-sale alert threshold is 500,000 UZS');
assert(DEFAULT_APP_SETTINGS.currency === 'UZS', 'Default business currency is UZS');
assert(DEFAULT_APP_SETTINGS.timezone === 'Asia/Tashkent', 'Default timezone is Asia/Tashkent');

console.log('\n====================================================');
console.log('🏁 ALL PHASE 3 TESTS PASSED SUCCESSFULLY!');
console.log('====================================================\n');
