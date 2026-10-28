/**
 * BiznesYordam - Finance & Expenses Module Test Suite
 * 
 * Verifies:
 * 1. Expense transaction input validation (amount > 0, date format YYYY-MM-DD, valid category).
 * 2. Financial analytics calculation (paidRevenue, unpaidDebt, COGS, expenses, estimatedNetProfit).
 * 3. Partial payments handling (partially_paid orders with/without paidAmount).
 * 4. Cancelled order exclusion (cancelled orders must not affect revenue, debt, or COGS).
 * 5. Date range filtering logic.
 * 6. Cross-tenant isolation & Firestore Security Rules for /users/{userId}/transactions/{transactionId}.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  validateExpenseInput,
  calculateFinanceMetrics,
  EXPENSE_CATEGORIES,
} from '../src/services/financeService';
import { Order, FinancialTransaction } from '../src/types/business';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✅ PASS: ${message}`);
  }
}

console.log('====================================================');
console.log('🧪 RUNNING FINANCE & EXPENSES TEST SUITE');
console.log('====================================================');

// ----------------------------------------------------
// 1. Expense Input Validation
// ----------------------------------------------------
console.log('\n--- 1. Expense Input Validation ---');

const validExpense = {
  type: 'expense' as const,
  category: 'ijara' as const,
  amount: 1500000,
  date: '2026-10-26',
  description: 'Do\'kon ijarasi uchun to\'lov',
};

const resValid = validateExpenseInput(validExpense);
assert(resValid.isValid, "Valid expense input passes validation");

const resZeroAmount = validateExpenseInput({ ...validExpense, amount: 0 });
assert(!resZeroAmount.isValid, "Expense with amount = 0 fails validation");
assert(
  resZeroAmount.errors.some((e) => e.includes("0 dan katta")),
  "Zero amount gives clear error message"
);

const resNegativeAmount = validateExpenseInput({ ...validExpense, amount: -500000 });
assert(!resNegativeAmount.isValid, "Negative amount fails validation");

const resBadDate = validateExpenseInput({ ...validExpense, date: '26/10/2026' });
assert(!resBadDate.isValid, "Non YYYY-MM-DD date format fails validation");

const resInvalidCategory = validateExpenseInput({ ...validExpense, category: 'invalid_cat' as any });
assert(!resInvalidCategory.isValid, "Invalid category fails validation");

// ----------------------------------------------------
// 2. Financial Analytics Calculation
// ----------------------------------------------------
console.log('\n--- 2. Financial Analytics Calculation & Partial Payments ---');

const mockOrders: Order[] = [
  // 1. Fully paid order
  {
    id: 'ord_1',
    userId: 'user_A',
    customerId: 'cust_1',
    customerName: 'Anvar',
    items: [],
    totalAmount: 1000000,
    totalCost: 600000,
    totalProfit: 400000,
    status: 'delivered',
    paymentStatus: 'paid',
    paidAmount: 1000000,
    stockDeducted: true,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  },
  // 2. Partially paid order with explicit paidAmount = 300,000 UZS
  {
    id: 'ord_2',
    userId: 'user_A',
    customerId: 'cust_2',
    customerName: 'Nodira',
    items: [],
    totalAmount: 1000000,
    totalCost: 500000,
    totalProfit: 500000,
    status: 'confirmed',
    paymentStatus: 'partially_paid',
    paidAmount: 300000,
    stockDeducted: true,
    createdAt: '2026-10-22T10:00:00.000Z',
    updatedAt: '2026-10-22T10:00:00.000Z',
  },
  // 3. Partially paid order WITHOUT paidAmount specified -> must count 0 revenue
  {
    id: 'ord_3',
    userId: 'user_A',
    customerId: 'cust_3',
    customerName: 'Dilshod',
    items: [],
    totalAmount: 500000,
    totalCost: 250000,
    totalProfit: 250000,
    status: 'confirmed',
    paymentStatus: 'partially_paid',
    // paidAmount missing
    stockDeducted: true,
    createdAt: '2026-10-25T10:00:00.000Z',
    updatedAt: '2026-10-25T10:00:00.000Z',
  },
  // 4. Cancelled order -> must be completely excluded from metrics
  {
    id: 'ord_4_cancelled',
    userId: 'user_A',
    customerId: 'cust_4',
    customerName: 'Kamola',
    items: [],
    totalAmount: 2000000,
    totalCost: 1000000,
    totalProfit: 1000000,
    status: 'cancelled',
    paymentStatus: 'unpaid',
    paidAmount: 0,
    stockDeducted: false,
    createdAt: '2026-10-21T10:00:00.000Z',
    updatedAt: '2026-10-21T10:00:00.000Z',
  },
];

const mockExpenses: FinancialTransaction[] = [
  {
    id: 'tx_1',
    userId: 'user_A',
    type: 'expense',
    category: 'ijara',
    amount: 500000,
    date: '2026-10-21',
    description: 'Do\'kon ijarasi',
    createdAt: '2026-10-21T10:00:00.000Z',
  },
  {
    id: 'tx_2',
    userId: 'user_A',
    type: 'expense',
    category: 'reklama',
    amount: 200000,
    date: '2026-10-24',
    description: 'Instagram reklama',
    createdAt: '2026-10-24T10:00:00.000Z',
  },
];

const metrics = calculateFinanceMetrics(mockOrders, mockExpenses);

// Expected Paid Revenue = 1,000,000 (ord_1) + 300,000 (ord_2) + 0 (ord_3) = 1,300,000 so'm
assert(metrics.paidRevenue === 1300000, "Paid revenue strictly counts real collected cash (1,300,000 so'm)");

// Expected Debt = 0 (ord_1) + 700,000 (ord_2) + 500,000 (ord_3) = 1,200,000 so'm
assert(metrics.unpaidDebt === 1200000, "Unpaid debt correctly sums outstanding credit balances (1,200,000 so'm)");

// Expected COGS = 600,000 (ord_1) + 500,000 (ord_2) + 250,000 (ord_3) = 1,350,000 so'm (ord_4_cancelled excluded)
assert(metrics.costOfGoodsSold === 1350000, "COGS includes only non-cancelled orders with deducted stock (1,350,000 so'm)");

// Expected Total Expenses = 500,000 + 200,000 = 700,000 so'm
assert(metrics.totalExpenses === 700000, "Total expenses calculated correctly (700,000 so'm)");

// Expected Estimated Net Profit = Paid Revenue (1,300,000) - COGS (1,350,000) - Expenses (700,000) = -750,000 so'm
assert(
  metrics.estimatedNetProfit === 1300000 - 1350000 - 700000,
  "Estimated Net Profit correctly calculated (Revenue - COGS - Expenses = -750,000 so'm)"
);

// ----------------------------------------------------
// 3. Date Range Filtering Test
// ----------------------------------------------------
console.log('\n--- 3. Date Range Filtering Test ---');

const rangeMetrics = calculateFinanceMetrics(mockOrders, mockExpenses, {
  startDate: '2026-10-22',
  endDate: '2026-10-26',
});

// Within 2026-10-22 to 2026-10-26:
// Orders: ord_2 (2026-10-22), ord_3 (2026-10-25).
// Paid Revenue = 300,000 (ord_2) + 0 (ord_3) = 300,000 so'm.
// Expenses: tx_2 (2026-10-24, 200,000 so'm).
assert(rangeMetrics.paidRevenue === 300000, "Date range filtering isolates revenue correctly (300,000 so'm)");
assert(rangeMetrics.totalExpenses === 200000, "Date range filtering isolates expenses correctly (200,000 so'm)");

// ----------------------------------------------------
// 4. Firestore Security Rules Audit
// ----------------------------------------------------
console.log('\n--- 4. Firestore Security Rules Audit ---');

const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');

assert(
  rulesContent.includes('match /transactions/{transactionId}'),
  "firestore.rules contains match block for /transactions/{transactionId}"
);

const txRuleSection = rulesContent.slice(
  rulesContent.indexOf('match /transactions/{transactionId}'),
  rulesContent.indexOf('// Orders (Access restricted to owner)')
);

assert(txRuleSection.includes('allow get, list: if isOwner(userId);'), "Transactions get/list rule enforces isOwner(userId)");
assert(txRuleSection.includes('incoming().userId == userId'), "Transactions write rule enforces incoming().userId == userId");
assert(txRuleSection.includes("incoming().type in ['income', 'expense']"), "Transactions rule enforces type in ['income', 'expense']");
assert(txRuleSection.includes("incoming().amount is number && incoming().amount > 0"), "Transactions rule enforces amount > 0");
assert(txRuleSection.includes("incoming().date is string && incoming().date.size() == 10"), "Transactions rule enforces date format size check");
assert(txRuleSection.includes('allow delete: if isOwner(userId);'), "Transactions delete rule enforces isOwner(userId)");

console.log('====================================================');
console.log('🏁 ALL FINANCE & EXPENSES TESTS PASSED SUCCESSFULLY');
console.log('====================================================');
