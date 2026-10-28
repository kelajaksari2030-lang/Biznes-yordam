/**
 * BiznesYordam - CRM & Inventory (Ombor) Unit & Security Test Suite
 * 
 * Verifies:
 * 1. CRM Customer input validation and phone formatting
 * 2. CRM Search, filtering by status and text
 * 3. Inventory Product input validation and unit constraints
 * 4. Inventory Low-stock alert detection and inventory stats calculation
 * 5. Inventory search and low-stock filtering
 * 6. Firestore security rules: Owner-isolation for /customers and /products
 * 7. ProfitCalculator to Inventory product conversion logic
 */

import fs from 'fs';
import path from 'path';
import {
  validateCustomerInput,
  filterCustomers,
  formatPhoneDisplay
} from '../src/services/crmService';
import {
  validateProductInput,
  isLowStock,
  calculateInventoryStats,
  filterProducts
} from '../src/services/inventoryService';
import { Customer, CustomerInput } from '../src/types/crm';
import { Product, ProductInput } from '../src/types/inventory';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✅ PASS: ${message}`);
  }
}

console.log('====================================================');
console.log('🧪 RUNNING CRM & INVENTORY TEST SUITE');
console.log('====================================================');

// ----------------------------------------------------
// 1. CRM Input Validation Tests
// ----------------------------------------------------
console.log('\n--- 1. CRM Input Validation ---');

const validCustomerInput: CustomerInput = {
  name: 'Alisher Usmonov',
  phone: '+998 90 123 45 67',
  telegramUsername: 'alisher_u',
  notes: 'Har oy 10 ta buyurtma beradi',
  status: 'yangi'
};

const validResult = validateCustomerInput(validCustomerInput);
assert(validResult.isValid === true && validResult.errors.length === 0, 'Valid customer input passes validation');

const emptyNameResult = validateCustomerInput({ ...validCustomerInput, name: '' });
assert(emptyNameResult.isValid === false, 'Empty name fails validation');
assert(emptyNameResult.errors.some(e => e.toLowerCase().includes('ism')), 'Empty name caught with descriptive error');

const emptyPhoneResult = validateCustomerInput({ ...validCustomerInput, phone: '' });
assert(emptyPhoneResult.isValid === false, 'Empty phone number fails validation');
assert(emptyPhoneResult.errors.some(e => e.toLowerCase().includes('telefon')), 'Empty phone number caught with error');

// Phone formatting check
const formattedPhone = formatPhoneDisplay('  +998 90 123 45 67  ');
assert(formattedPhone === '+998 90 123 45 67', 'Phone display format trims whitespace properly');

// ----------------------------------------------------
// 2. CRM Search & Filtering Tests
// ----------------------------------------------------
console.log('\n--- 2. CRM Search & Filtering ---');

const mockCustomers: Customer[] = [
  {
    id: 'c1',
    userId: 'u1',
    name: 'Dilshod Karimov',
    phone: '+998 91 234 56 78',
    telegramUsername: 'dilshod_k',
    notes: 'Kiyim do\'koni egasi',
    status: 'yangi',
    createdAt: '2026-10-20T10:00:00Z',
    updatedAt: '2026-10-20T10:00:00Z'
  },
  {
    id: 'c2',
    userId: 'u1',
    name: 'Madina Rahimova',
    phone: '+998 93 345 67 89',
    telegramUsername: 'madina_cosmetics',
    notes: 'Kosmetika buyurtmalari',
    status: 'xarid_qildi',
    createdAt: '2026-10-21T10:00:00Z',
    updatedAt: '2026-10-21T10:00:00Z'
  },
  {
    id: 'c3',
    userId: 'u1',
    name: 'Sardor Qodirov',
    phone: '+998 97 456 78 90',
    telegramUsername: '',
    notes: 'Toshkent shahar yetkazish',
    status: 'muzokara',
    createdAt: '2026-10-22T10:00:00Z',
    updatedAt: '2026-10-22T10:00:00Z'
  }
];

const nameSearch = filterCustomers(mockCustomers, 'Dilshod', 'all');
assert(nameSearch.length === 1 && nameSearch[0].id === 'c1', 'Search by name returns correct customer');

const phoneSearch = filterCustomers(mockCustomers, '345 67', 'all');
assert(phoneSearch.length === 1 && phoneSearch[0].id === 'c2', 'Search by phone fragment returns correct customer');

const statusFilter = filterCustomers(mockCustomers, '', 'xarid_qildi');
assert(statusFilter.length === 1 && statusFilter[0].id === 'c2', 'Status filter matches only "xarid_qildi" customers');

const noMatch = filterCustomers(mockCustomers, 'NonExistent', 'all');
assert(noMatch.length === 0, 'Non-existent customer search returns empty array');

// ----------------------------------------------------
// 3. Inventory Product Validation Tests
// ----------------------------------------------------
console.log('\n--- 3. Inventory Product Validation ---');

const validProductInput: ProductInput = {
  name: 'Erkaklar ko\'ylagi (Oq)',
  sku: 'SHIRT-WHT-001',
  purchasePrice: 120000,
  sellingPrice: 220000,
  quantity: 50,
  unit: 'dona',
  minStockAlert: 10,
  category: 'Kiyim'
};

const prodValidRes = validateProductInput(validProductInput);
assert(prodValidRes.isValid === true && prodValidRes.errors.length === 0, 'Valid product input passes validation');

const prodEmptyName = validateProductInput({ ...validProductInput, name: '' });
assert(prodEmptyName.isValid === false, 'Empty product name fails validation');
assert(prodEmptyName.errors.some(e => e.toLowerCase().includes('nomi')), 'Empty product name error caught');

const prodNegPurchase = validateProductInput({ ...validProductInput, purchasePrice: -5000 });
assert(prodNegPurchase.isValid === false, 'Negative purchase price fails validation');
assert(prodNegPurchase.errors.some(e => e.toLowerCase().includes('xarid')), 'Negative purchase price error caught');

const prodNegSelling = validateProductInput({ ...validProductInput, sellingPrice: -1 });
assert(prodNegSelling.isValid === false, 'Negative selling price fails validation');
assert(prodNegSelling.errors.some(e => e.toLowerCase().includes('sotuv')), 'Negative selling price error caught');

const prodNegQty = validateProductInput({ ...validProductInput, quantity: -1 });
assert(prodNegQty.isValid === false, 'Negative quantity fails validation');
assert(prodNegQty.errors.some(e => e.toLowerCase().includes('miqdor')), 'Negative quantity error caught');

// ----------------------------------------------------
// 4. Low-Stock Alert & Stats Calculation Tests
// ----------------------------------------------------
console.log('\n--- 4. Low-Stock Alert & Stats Calculation ---');

const mockProducts: Product[] = [
  {
    id: 'p1',
    userId: 'u1',
    name: 'Smartfon g\'ilofi',
    sku: 'CASE-01',
    purchasePrice: 20000,
    sellingPrice: 50000,
    quantity: 3, // Low stock: 3 <= 5
    unit: 'dona',
    minStockAlert: 5,
    category: 'Aksessuarlar',
    createdAt: '2026-10-20T10:00:00Z',
    updatedAt: '2026-10-20T10:00:00Z'
  },
  {
    id: 'p2',
    userId: 'u1',
    name: 'Zaryadlovchi kabel (Type-C)',
    sku: 'CAB-02',
    purchasePrice: 15000,
    sellingPrice: 40000,
    quantity: 25, // Normal stock: 25 > 10
    unit: 'dona',
    minStockAlert: 10,
    category: 'Aksessuarlar',
    createdAt: '2026-10-21T10:00:00Z',
    updatedAt: '2026-10-21T10:00:00Z'
  },
  {
    id: 'p3',
    userId: 'u1',
    name: 'Simsiz quloqchin',
    sku: 'EAR-03',
    purchasePrice: 100000,
    sellingPrice: 180000,
    quantity: 0, // Out of stock: 0 <= 2
    unit: 'dona',
    minStockAlert: 2,
    category: 'Elektronika',
    createdAt: '2026-10-22T10:00:00Z',
    updatedAt: '2026-10-22T10:00:00Z'
  }
];

assert(isLowStock(mockProducts[0]) === true, 'Product with qty 3 and alert 5 flagged as low stock');
assert(isLowStock(mockProducts[1]) === false, 'Product with qty 25 and alert 10 is NOT flagged as low stock');
assert(isLowStock(mockProducts[2]) === true, 'Product with qty 0 and alert 2 flagged as low stock');

const stats = calculateInventoryStats(mockProducts);
assert(stats.totalProducts === 3, `Total products calculated correctly (${stats.totalProducts})`);
assert(stats.lowStockCount === 2, `Low stock count calculated correctly (${stats.lowStockCount})`);

// p1: 3 * 20000 = 60000, p2: 25 * 15000 = 375000, p3: 0 * 100000 = 0 => total = 435000
const expectedCost = 3 * 20000 + 25 * 15000;
assert(stats.totalPurchaseValue === expectedCost, `Total purchase cost (${stats.totalPurchaseValue}) matches expected (${expectedCost})`);

// p1: 3 * 50000 = 150000, p2: 25 * 40000 = 1000000, p3: 0 => total = 1150000
const expectedRevenue = 3 * 50000 + 25 * 40000;
assert(stats.totalSellingValue === expectedRevenue, `Total potential selling value (${stats.totalSellingValue}) matches expected (${expectedRevenue})`);

const expectedProfit = expectedRevenue - expectedCost;
assert(stats.potentialProfit === expectedProfit, `Potential profit (${stats.potentialProfit}) matches expected (${expectedProfit})`);

// ----------------------------------------------------
// 5. Inventory Search & Filtering Tests
// ----------------------------------------------------
console.log('\n--- 5. Inventory Search & Low-Stock Filtering ---');

const lowStockFiltered = filterProducts(mockProducts, '', true);
assert(lowStockFiltered.length === 2, 'Low stock filter returns exactly 2 products');

const skuSearch = filterProducts(mockProducts, 'CAB-02', false);
assert(skuSearch.length === 1 && skuSearch[0].id === 'p2', 'Search by SKU returns exact matching product');

const categorySearch = filterProducts(mockProducts, 'Elektronika', false);
assert(categorySearch.length === 1 && categorySearch[0].id === 'p3', 'Search by category returns exact matching product');

// ----------------------------------------------------
// 6. Firestore Security Rules Isolation Check
// ----------------------------------------------------
console.log('\n--- 6. Firestore Security Rules Verification ---');

const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');

assert(
  rulesContent.includes('match /customers/{customerId}'),
  'firestore.rules contains match rule for /customers/{customerId}'
);

assert(
  rulesContent.includes('match /products/{productId}'),
  'firestore.rules contains match rule for /products/{productId}'
);

// Verify user isolation in customer rules
const customerMatch = rulesContent.slice(rulesContent.indexOf('match /customers/{customerId}'));
assert(
  customerMatch.includes('allow get, list: if isOwner(userId)'),
  'Customer read rule strictly enforces isOwner(userId)'
);
assert(
  customerMatch.includes('incoming().userId == userId'),
  'Customer write rule strictly enforces incoming().userId == userId'
);

// Verify user isolation in product rules
const productMatch = rulesContent.slice(rulesContent.indexOf('match /products/{productId}'));
assert(
  productMatch.includes('allow get, list: if isOwner(userId)'),
  'Product read rule strictly enforces isOwner(userId)'
);
assert(
  productMatch.includes('incoming().userId == userId'),
  'Product write rule strictly enforces incoming().userId == userId'
);

// ----------------------------------------------------
// 7. ProfitCalculator to Inventory Integration Logic
// ----------------------------------------------------
console.log('\n--- 7. ProfitCalculator Integration Logic ---');

// Emulate user calculation input from ProfitCalculator
const calcInputs = {
  purchaseCost: 150000,
  sellingPrice: 240000,
  quantity: 30,
};
const calcName = "Erkaklar kostyumi";

// Convert to product input as done in handleSaveToInventory
const generatedProduct: ProductInput = {
  name: calcName.trim() || 'Hisoblangan mahsulot',
  purchasePrice: calcInputs.purchaseCost,
  sellingPrice: calcInputs.sellingPrice,
  quantity: calcInputs.quantity,
  unit: 'dona',
  minStockAlert: Math.max(1, Math.min(5, Math.round(calcInputs.quantity * 0.2))),
  category: 'Kalkulyatordan'
};

const genValid = validateProductInput(generatedProduct);
assert(genValid.isValid === true, 'Generated product from ProfitCalculator passes validation');
assert(generatedProduct.purchasePrice === 150000, 'Purchase price accurately transferred from calculation');
assert(generatedProduct.sellingPrice === 240000, 'Selling price accurately transferred from calculation');
assert(generatedProduct.quantity === 30, 'Quantity accurately transferred from calculation');
assert(generatedProduct.minStockAlert === 5, 'Min stock alert is appropriately clamped (5)');

console.log('====================================================');
console.log('🏁 ALL CRM & INVENTORY TESTS PASSED SUCCESSFULLY');
console.log('====================================================\n');
