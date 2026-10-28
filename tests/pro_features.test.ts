/**
 * BiznesYordam - Pro Features & Safe CSV Export Test Suite
 * 
 * Verifies:
 * 1. UTF-8 BOM (\uFEFF) inclusion for Excel compatibility with Uzbek Latin/Cyrillic.
 * 2. Standard RFC 4180 CSV conversion with explicit column order.
 * 3. Commas, quotes, and newlines escaping.
 * 4. Safe handling of null, undefined, 0, and empty strings.
 * 5. Preservation of genuine negative numbers (-5000, -12.5).
 * 6. Protection against CSV / DDE Formula Injection (=, +, -, @, \t).
 * 7. Column custom formatters.
 * 8. SSR safety of download trigger.
 */

import {
  convertToCsv,
  escapeCsvCell,
  isRealNumber,
  downloadCsv,
  CsvColumn,
  buildFinanceReportCsv,
} from '../src/utils/exportCsv';
import {
  canExportFinancialReports,
  canAccessBusinessForecast,
  PLANS,
  ADMIN_PLAN,
  isAdminUser,
  SimulatedTier,
} from '../src/config/plans';
import {
  calculateRevenueForecast,
  calculateWarehouseNeedsForecast,
  calculateCashFlowForecast,
  generateBusinessForecast,
  getOrderActualPaid,
  MIN_HISTORICAL_DAYS,
  MIN_HISTORICAL_ORDERS,
} from '../src/services/businessForecastService';
import { Order, FinancialTransaction } from '../src/types/business';
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
console.log('🧪 RUNNING PRO FEATURES - SAFE CSV EXPORT TEST SUITE');
console.log('====================================================');

// ----------------------------------------------------
// 1. isRealNumber checks
// ----------------------------------------------------
console.log('\n--- 1. Real Number Detection ---');

assert(isRealNumber(100) === true, 'Positive integer is a real number');
assert(isRealNumber(-5000) === true, 'Negative integer is a real number');
assert(isRealNumber(0) === true, 'Zero (0) is a real number');
assert(isRealNumber(-12.75) === true, 'Negative decimal is a real number');
assert(isRealNumber(45.99) === true, 'Positive decimal is a real number');
assert(isRealNumber('-150000') === true, 'Numeric string "-150000" is recognized as a real number');
assert(isRealNumber('250.50') === true, 'Numeric string "250.50" is recognized as a real number');
assert(isRealNumber('0') === true, 'Numeric string "0" is recognized as a real number');

assert(isRealNumber('=SUM(A1:B1)') === false, 'Formula "=SUM(A1:B1)" is not a real number');
assert(isRealNumber('-calc') === false, 'Formula payload "-calc" is not a real number');
assert(isRealNumber('+123-abc') === false, 'Alphanumeric "+123-abc" is not a real number');
assert(isRealNumber('@cmd') === false, 'Formula payload "@cmd" is not a real number');
assert(isRealNumber('') === false, 'Empty string is not a real number');
assert(isRealNumber(null) === false, 'null is not a real number');
assert(isRealNumber(undefined) === false, 'undefined is not a real number');
assert(isRealNumber(NaN) === false, 'NaN is not a real number');

// ----------------------------------------------------
// 2. Cell Escaping & Formula Injection Protection
// ----------------------------------------------------
console.log('\n--- 2. Cell Escaping & Formula Injection Protection ---');

// Null and undefined
assert(escapeCsvCell(null) === '', 'null produces an empty string');
assert(escapeCsvCell(undefined) === '', 'undefined produces an empty string');

// Zero and positive numbers
assert(escapeCsvCell(0) === '0', 'Number 0 is preserved as "0"');
assert(escapeCsvCell(15000) === '15000', 'Positive number 15000 is preserved without quotes');

// Real negative numbers must NOT be mangled with formula prefixing
assert(escapeCsvCell(-750000) === '-750000', 'Real negative number -750000 is preserved without formula prefix');
assert(escapeCsvCell('-25000') === '-25000', 'Real negative numeric string "-25000" is preserved without formula prefix');
assert(escapeCsvCell(-12.5) === '-12.5', 'Real negative decimal -12.5 is preserved without formula prefix');

// Formula injection attempts must be neutralized
const formulaEqual = escapeCsvCell('=cmd|"/C calc"!A0');
assert(formulaEqual.startsWith('"\'='), 'Formula beginning with "=" is prefixed with single quote and quoted');

const formulaPlus = escapeCsvCell('+1+2+cmd');
assert(formulaPlus.startsWith('"\'\+'), 'Formula beginning with "+" is prefixed with single quote and quoted');

const formulaMinus = escapeCsvCell('-2+3+cmd');
assert(formulaMinus.startsWith('"\'\-'), 'Non-numeric string beginning with "-" is prefixed with single quote and quoted');

const formulaAt = escapeCsvCell('@SUM(A1:B2)');
assert(formulaAt.startsWith('"\'@'), 'Formula beginning with "@" is prefixed with single quote and quoted');

const formulaTab = escapeCsvCell('\tmalicious_payload');
assert(formulaTab.startsWith('"\''), 'String beginning with tab is prefixed with single quote and quoted');

// Standard RFC 4180 escaping
assert(escapeCsvCell('Toshkent, Chilonzor') === '"Toshkent, Chilonzor"', 'Cell with comma is wrapped in double quotes');
assert(escapeCsvCell('Klassik "Premium" Soat') === '"Klassik ""Premium"" Soat"', 'Cell with double quotes escapes internal quotes');
assert(escapeCsvCell('Birinchi qator\nIkkinchi qator') === '"Birinchi qator\nIkkinchi qator"', 'Cell with newline is wrapped in double quotes');

// ----------------------------------------------------
// 3. UTF-8 BOM & Uzbek Language Characters
// ----------------------------------------------------
console.log('\n--- 3. UTF-8 BOM & Uzbek Language Compatibility ---');

interface SampleProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  profit: number;
}

const sampleData: SampleProduct[] = [
  {
    id: 'p1',
    name: "Erkaklar klassik soati (O'zbekiston)",
    category: 'Aksessuarlar',
    price: 350000,
    cost: 180000,
    profit: 170000,
  },
  {
    id: 'p2',
    name: 'Charm poyabzal "Premium"',
    category: 'Poyabzal',
    price: 450000,
    cost: 500000,
    profit: -50000, // Negative profit / loss
  },
  {
    id: 'p3',
    name: '=2+5*calc', // Malicious product name simulation
    category: 'Test & Xavfsizlik',
    price: 10000,
    cost: 5000,
    profit: 5000,
  },
];

const columns: CsvColumn<SampleProduct>[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Mahsulot nomi' },
  { key: 'category', header: 'Kategoriya' },
  { key: 'price', header: 'Sotuv narxi (so\'m)' },
  { key: 'cost', header: 'Tannarx (so\'m)' },
  { key: 'profit', header: 'Foyda / Zarar' },
];

const csvResult = convertToCsv(sampleData, columns);

assert(csvResult.startsWith('\uFEFF'), 'CSV string begins with UTF-8 BOM (\\uFEFF)');
assert(csvResult.includes("O'zbekiston"), 'Uzbek Latin character apostrophe is preserved');
assert(csvResult.includes('Sotuv narxi (so\'m)'), 'Header text is properly encoded');
assert(csvResult.includes('-50000'), 'Negative profit (-50000) is preserved as a clean number');
assert(csvResult.includes('"\'=2+5*calc"'), 'Malicious formula name is neutralized with single quote');

// Test with includeBom = false
const csvWithoutBom = convertToCsv(sampleData, columns, { includeBom: false });
assert(!csvWithoutBom.startsWith('\uFEFF'), 'includeBom: false cleanly omits UTF-8 BOM');

// ----------------------------------------------------
// 4. Custom Formatters and Column Ordering
// ----------------------------------------------------
console.log('\n--- 4. Column Formatters and Ordering ---');

interface OrderRow {
  orderNumber: string;
  total: number;
  status: string;
  date: string | null;
}

const orderData: OrderRow[] = [
  {
    orderNumber: 'ORD-101',
    total: 750000,
    status: 'paid',
    date: '2026-10-25',
  },
  {
    orderNumber: 'ORD-102',
    total: 300000,
    status: 'unpaid',
    date: null,
  },
];

const orderCols: CsvColumn<OrderRow>[] = [
  { key: 'orderNumber', header: 'Buyurtma #' },
  {
    key: 'status',
    header: 'Holati',
    formatter: (val) => (val === 'paid' ? "To'langan" : "To'lanmagan"),
  },
  {
    key: 'total',
    header: 'Summa',
    formatter: (val) => `${val} so'm`,
  },
  {
    key: 'date',
    header: 'Sana',
    formatter: (val) => val || 'Sana yo\'q',
  },
];

const orderCsv = convertToCsv(orderData, orderCols, { includeBom: false });
const lines = orderCsv.split('\r\n');

assert(lines.length === 3, 'CSV output has exactly 3 lines (1 header + 2 rows)');
assert(
  lines[0] === 'Buyurtma #,Holati,Summa,Sana',
  'Header row exactly respects specified column order'
);
assert(
  lines[1] === "ORD-101,To'langan,750000 so'm,2026-10-25",
  'Row 1 custom formatters correctly applied'
);
assert(
  lines[2] === "ORD-102,To'lanmagan,300000 so'm,Sana yo'q",
  'Row 2 null date formatter fallback applied'
);

// ----------------------------------------------------
// 5. SSR / Node.js Environment Safety
// ----------------------------------------------------
console.log('\n--- 5. SSR / Node.js Environment Safety ---');

try {
  downloadCsv('test.csv', 'dummy,data');
  assert(true, 'downloadCsv executes safely as a no-op in Node.js test environment without throwing');
} catch (err) {
  assert(false, `downloadCsv threw an unexpected error: ${err}`);
}

// ----------------------------------------------------
// 6. Advanced Formula Injection Edge Cases (Whitespace & Control Chars)
// ----------------------------------------------------
console.log('\n--- 6. Advanced Formula Injection Edge Cases ---');

// Leading spaces before formula triggers
const leadingSpaceFormula = escapeCsvCell('   =1+1');
assert(leadingSpaceFormula.startsWith('"\'   ='), 'Leading spaces before "=" trigger single-quote prefix and quotes');

const leadingTabPlus = escapeCsvCell('\t  +cmd');
assert(leadingTabPlus.startsWith('"\'\t  +'), 'Leading tab before "+" triggers single-quote prefix and quotes');

const leadingSpaceMinusFormula = escapeCsvCell('  -SUM(A1)');
assert(leadingSpaceMinusFormula.startsWith('"\'  -'), 'Leading spaces before "-SUM(A1)" trigger single-quote prefix');

const leadingNewlineAt = escapeCsvCell('\r\n@malicious');
assert(leadingNewlineAt.startsWith('"\'\r\n@'), 'Leading CRLF before "@" triggers single-quote prefix');

const pipeCommand = escapeCsvCell('   |calc');
assert(pipeCommand.startsWith('"\'   |'), 'Leading spaces before pipe "|" trigger single-quote prefix');

const directTabAttack = escapeCsvCell('\t=cmd');
assert(directTabAttack.startsWith('"\'\t='), 'Direct tab before "=" triggers single-quote prefix');

const directNewlineAttack = escapeCsvCell('\n=1+1');
assert(directNewlineAttack.startsWith('"\'\n='), 'Direct newline before "=" triggers single-quote prefix');

// ----------------------------------------------------
// 7. Explicit Column Types ('text' vs 'number')
// ----------------------------------------------------
console.log('\n--- 7. Explicit Column Types & Numeric Strings ---');

// Phone numbers or SKU codes starting with '+' or '-' in text columns
const textColPhone = escapeCsvCell('+998901234567', { type: 'text' });
assert(textColPhone === '"\'+998901234567"', 'Phone number with + in text column is safely escaped with quote');

const textColCode = escapeCsvCell('-0012', { type: 'text' });
assert(textColCode === '"\'-0012"', 'SKU code -0012 in text column is escaped to prevent spreadsheet evaluation');

// Explicit number column preserves clean negative numeric strings
const numColNegative = escapeCsvCell('-5000', { type: 'number' });
assert(numColNegative === '-5000', 'Explicit number column cleanly preserves negative numeric string without quote');

const numColDecimal = escapeCsvCell('-125.75', { type: 'number' });
assert(numColDecimal === '-125.75', 'Explicit number column cleanly preserves negative decimal numeric string');

// Explicit number column still protects against malicious formulas
const numColFormula = escapeCsvCell('-1+1+cmd', { type: 'number' });
assert(numColFormula.startsWith('"\'\-'), 'Explicit number column still catches non-numeric formula attacks');

// ----------------------------------------------------
// 8. Dates, Booleans, and Special Values
// ----------------------------------------------------
console.log('\n--- 8. Dates, Booleans, and Special Values ---');

const testDate = new Date('2026-10-27T10:00:00.000Z');
assert(escapeCsvCell(testDate) === '2026-10-27T10:00:00.000Z', 'Date object is converted to ISO string');

assert(escapeCsvCell(true) === 'true', 'Boolean true is rendered as "true"');
assert(escapeCsvCell(false) === 'false', 'Boolean false is rendered as "false"');
assert(escapeCsvCell(Infinity) === '', 'Infinity returns empty string');
assert(escapeCsvCell(-Infinity) === '', '-Infinity returns empty string');

// ----------------------------------------------------
// 9. Uzbek Cyrillic & Extended Latin In Datasets
// ----------------------------------------------------
console.log('\n--- 9. Uzbek Cyrillic & Extended Latin In Datasets ---');

interface RegionalEntry {
  region: string;
  notes: string;
  amount: number;
}

const regionalData: RegionalEntry[] = [
  {
    region: 'Тошкент шаҳри',
    notes: 'Қарздорлик тўлиқ ёпилди. Ҳисобот топширилди.',
    amount: -1200000,
  },
  {
    region: 'Самарқанд вилояти',
    notes: "O'zbekiston bo'yicha to'lovlar jadvali (G'allaorol)",
    amount: 850000,
  },
];

const regionalCols: CsvColumn<RegionalEntry>[] = [
  { key: 'region', header: 'Ҳудуд / Viloyat', type: 'text' },
  { key: 'notes', header: 'Изоҳ / Izoh', type: 'text' },
  { key: 'amount', header: 'Қолдиқ / Qoldiq', type: 'number' },
];

const regionalCsv = convertToCsv(regionalData, regionalCols, { includeBom: true });
assert(regionalCsv.startsWith('\uFEFF'), 'Regional CSV starts with UTF-8 BOM');
assert(regionalCsv.includes('Тошкент шаҳри'), 'Uzbek Cyrillic text is preserved');
assert(regionalCsv.includes('Қарздорлик тўлиқ ёпилди'), 'Uzbek Cyrillic description is preserved');
assert(regionalCsv.includes("O'zbekiston bo'yicha"), 'Uzbek Latin apostrophe text is preserved');
assert(regionalCsv.includes('-1200000'), 'Negative currency amount is properly formatted');

// ----------------------------------------------------
// 10. Finance Module CSV Report Integration & Injection Protection
// ----------------------------------------------------
console.log('\n--- 10. Finance Module CSV Report Integration & Injection Protection ---');

const mockReportMetrics = {
  paidRevenue: 1300000,
  unpaidDebt: 1200000,
  costOfGoodsSold: 1350000,
  totalExpenses: 700000,
  estimatedNetProfit: -750000,
  profitMarginPercent: -58,
  orderCount: 3,
  expenseCount: 2,
};

const mockReportExpenses = [
  {
    id: 'tx_1',
    date: '2026-10-21',
    category: 'Ijara haqi',
    description: 'Do\'kon ijarasi uchun to\'lov',
    amount: 500000,
  },
  {
    id: 'tx_2',
    date: '2026-10-24',
    category: 'Reklama & Marketing',
    description: '=cmd|"/C calc"!A0', // Injection payload in description
    amount: 200000,
  },
];

const mockReportOrders = [
  {
    id: 'ord_1',
    orderNumber: 'ORD-101',
    customerName: '+998901234567 Ali', // Starts with +
    customerPhone: '+998901234567',
    items: [{ productName: 'Erkaklar soati', quantity: 1 }],
    totalAmount: 1000000,
    paidAmount: 1000000,
    totalCost: 600000,
    status: 'delivered',
    paymentStatus: 'paid',
    createdAt: '2026-10-20T10:00:00.000Z',
  },
  {
    id: 'ord_2',
    orderNumber: 'ORD-102',
    customerName: '@malicious_user', // Starts with @
    customerPhone: '+998939998877',
    items: [{ productName: '-1+1*DDE("calc")', quantity: 2 }], // Formula in product name
    totalAmount: 1000000,
    paidAmount: 300000,
    totalCost: 500000,
    status: 'confirmed',
    paymentStatus: 'partially_paid',
    createdAt: '2026-10-22T10:00:00.000Z',
  },
];

const fullReportCsv = buildFinanceReportCsv({
  dateRangeLabel: '2026-10-01 - 2026-10-27',
  metrics: mockReportMetrics,
  expenses: mockReportExpenses,
  orders: mockReportOrders,
});

// Check UTF-8 BOM
assert(fullReportCsv.startsWith('\uFEFF'), 'Full financial report starts with UTF-8 BOM');

// Check Required Summary Headers
assert(fullReportCsv.includes("Sana oralig'i"), 'Report contains "Sana oralig\'i" header');
assert(fullReportCsv.includes("To'langan tushum"), 'Report contains "To\'langan tushum" header');
assert(fullReportCsv.includes("Qolgan qarzdorlik"), 'Report contains "Qolgan qarzdorlik" header');
assert(fullReportCsv.includes("Mahsulot tannarxi (COGS)"), 'Report contains "Mahsulot tannarxi (COGS)" header');
assert(fullReportCsv.includes("Operatsion xarajatlar"), 'Report contains "Operatsion xarajatlar" header');
assert(fullReportCsv.includes("Taxminiy sof foyda"), 'Report contains "Taxminiy sof foyda" header');
assert(fullReportCsv.includes("Rentabellik marjasi (%)"), 'Report contains "Rentabellik marjasi (%)" header');

// Check Values In Summary Row
assert(fullReportCsv.includes('2026-10-01 - 2026-10-27'), 'Summary row contains active date range label');
assert(fullReportCsv.includes('1300000'), 'Summary row contains paid revenue (1300000)');
assert(fullReportCsv.includes('1200000'), 'Summary row contains unpaid debt (1200000)');
assert(fullReportCsv.includes('1350000'), 'Summary row contains COGS (1350000)');
assert(fullReportCsv.includes('700000'), 'Summary row contains total expenses (700000)');
assert(fullReportCsv.includes('-750000'), 'Real negative net profit (-750000) is cleanly preserved without quotes');

// Check Formula Injection Protection on Text Fields
assert(fullReportCsv.includes('"\'=cmd|""/C calc""!A0"'), 'Formula injection in expense description is escaped with single-quote');
assert(fullReportCsv.includes('"\'@malicious_user"'), 'Customer name starting with @ is escaped with single-quote');
assert(fullReportCsv.includes('"\'+998901234567"'), 'Customer phone starting with + is escaped with single-quote');
assert(fullReportCsv.includes('"\'-1+1*DDE(""calc"") (2)"'), 'Product name starting with - is escaped with single-quote');

// Check Uzbek Status Labels
assert(fullReportCsv.includes('Yetkazilgan'), 'Delivered order status mapped to "Yetkazilgan"');
assert(fullReportCsv.includes('Tasdiqlangan'), 'Confirmed order status mapped to "Tasdiqlangan"');
assert(fullReportCsv.includes("To'langan"), 'Paid payment status mapped to "To\'langan"');
assert(fullReportCsv.includes("Qisman to'langan"), 'Partially paid status mapped to "Qisman to\'langan"');

// Check Minimal Report Without Orders/Expenses
const minimalReportCsv = buildFinanceReportCsv({
  dateRangeLabel: 'Barcha davr',
  metrics: mockReportMetrics,
});
assert(minimalReportCsv.startsWith('\uFEFF'), 'Minimal report starts with UTF-8 BOM');
assert(minimalReportCsv.includes("Taxminiy sof foyda"), 'Minimal report contains summary headers');
assert(!minimalReportCsv.includes('OPERATSION XARAJATLAR TAFSILOTI'), 'Minimal report cleanly omits expenses section when empty');
assert(!minimalReportCsv.includes('SOTUV VA BUYURTMALAR TAFSILOTI'), 'Minimal report cleanly omits orders section when empty');

// ----------------------------------------------------
// 11. Plan Entitlements & Financial CSV Export Gating (Free / Pro / Ultra / Admin)
// ----------------------------------------------------
console.log('\n--- 11. Plan Entitlements & Financial CSV Export Gating (Free / Pro / Ultra / Admin) ---');

// 1. Direct canExportFinancialReports checks
assert(canExportFinancialReports('free') === false, 'FREE tier: canExportFinancialReports is false');
assert(canExportFinancialReports('pro') === true, 'PRO tier: canExportFinancialReports is true');
assert(canExportFinancialReports('ultra') === true, 'ULTRA tier: canExportFinancialReports is true');
assert(canExportFinancialReports('admin') === true, 'ADMIN tier: canExportFinancialReports is true');
assert(canExportFinancialReports(undefined) === false, 'undefined plan: canExportFinancialReports is false');
assert(canExportFinancialReports(null) === false, 'null plan: canExportFinancialReports is false');
assert(canExportFinancialReports('') === false, 'empty string: canExportFinancialReports is false');
assert(canExportFinancialReports('other') === false, 'unknown tier: canExportFinancialReports is false');

// 2. Authoritative Effective Plan Derivation (exact logic from AuthContext.tsx)
function deriveEffectivePlan(
  email: string | null | undefined,
  userProfilePlan: 'free' | 'pro' | 'ultra' | undefined,
  simTier: SimulatedTier = 'admin'
) {
  const isAdmin = isAdminUser(email);
  const currentPlan = (isAdmin && simTier !== 'admin' && PLANS[simTier])
    ? PLANS[simTier]
    : isAdmin
      ? ADMIN_PLAN
      : (userProfilePlan && PLANS[userProfilePlan])
        ? PLANS[userProfilePlan]
        : PLANS.free;
  return currentPlan;
}

// Regular Free User
const regularFreePlan = deriveEffectivePlan('tadbirkor@gmail.com', 'free');
assert(regularFreePlan.id === 'free', 'Regular Free user receives Free plan');
assert(canExportFinancialReports(regularFreePlan.id) === false, 'Regular Free user: CSV export is blocked');

// Regular Pro User
const regularProPlan = deriveEffectivePlan('pro_user@gmail.com', 'pro');
assert(regularProPlan.id === 'pro', 'Regular Pro user receives Pro plan');
assert(canExportFinancialReports(regularProPlan.id) === true, 'Regular Pro user: CSV export is permitted');

// Regular Ultra User
const regularUltraPlan = deriveEffectivePlan('ultra_user@gmail.com', 'ultra');
assert(regularUltraPlan.id === 'ultra', 'Regular Ultra user receives Ultra plan');
assert(canExportFinancialReports(regularUltraPlan.id) === true, 'Regular Ultra user: CSV export is permitted');

// Tamper Attempt: Regular Free user injects simulatedTier = 'pro' or 'ultra'
const tamperedFreePlan = deriveEffectivePlan('tadbirkor@gmail.com', 'free', 'ultra');
assert(tamperedFreePlan.id === 'free', 'Tampering by non-admin is strictly ignored; remains Free plan');
assert(canExportFinancialReports(tamperedFreePlan.id) === false, 'Tampered non-admin: CSV export remains blocked');

// Admin in Default Mode
const adminDefaultPlan = deriveEffectivePlan('kelajaksari2030@gmail.com', 'ultra', 'admin');
assert(adminDefaultPlan.id === 'admin', 'Verified Admin in default mode receives Admin plan');
assert(canExportFinancialReports(adminDefaultPlan.id) === true, 'Admin default mode: CSV export is permitted');

// Admin Simulating Free
const adminSimFreePlan = deriveEffectivePlan('kelajaksari2030@gmail.com', 'ultra', 'free');
assert(adminSimFreePlan.id === 'free', 'Verified Admin simulating Free receives Free plan');
assert(canExportFinancialReports(adminSimFreePlan.id) === false, 'Admin simulating Free: CSV export is blocked (button hidden)');

// Admin Simulating Pro
const adminSimProPlan = deriveEffectivePlan('kelajaksari2030@gmail.com', 'ultra', 'pro');
assert(adminSimProPlan.id === 'pro', 'Verified Admin simulating Pro receives Pro plan');
assert(canExportFinancialReports(adminSimProPlan.id) === true, 'Admin simulating Pro: CSV export is permitted (button shown)');

// Admin Simulating Ultra
const adminSimUltraPlan = deriveEffectivePlan('kelajaksari2030@gmail.com', 'ultra', 'ultra');
assert(adminSimUltraPlan.id === 'ultra', 'Verified Admin simulating Ultra receives Ultra plan');
assert(canExportFinancialReports(adminSimUltraPlan.id) === true, 'Admin simulating Ultra: CSV export is permitted (button shown)');

// 3. handleExportCsv Guard Simulation
function simulateHandleExportCsv(planId: string) {
  const canExport = canExportFinancialReports(planId);
  if (!canExport) {
    return {
      allowed: false,
      feedback: "Moliyaviy hisobotni CSV formatida yuklab olish faqat Pro va Ultra tariflarida mavjud. Iltimos, tarifingizni yangilang.",
      csv: null,
    };
  }

  const csv = buildFinanceReportCsv({
    dateRangeLabel: 'Barcha davr',
    metrics: mockReportMetrics,
  });

  return {
    allowed: true,
    feedback: "Moliyaviy hisobot CSV formatida muvaffaqiyatli yuklab olindi!",
    csv,
  };
}

// FREE user invocation test
const freeResult = simulateHandleExportCsv('free');
assert(freeResult.allowed === false, 'Free user handleExportCsv is blocked');
assert(freeResult.csv === null, 'Free user handleExportCsv generates no CSV');
assert(freeResult.feedback.includes('Pro va Ultra tariflarida mavjud'), 'Free user receives upgrade prompt feedback');

// PRO user invocation test
const proResult = simulateHandleExportCsv('pro');
assert(proResult.allowed === true, 'Pro user handleExportCsv succeeds');
assert(proResult.csv !== null && proResult.csv.startsWith('\uFEFF'), 'Pro user receives valid CSV with UTF-8 BOM');

// ULTRA user invocation test
const ultraResult = simulateHandleExportCsv('ultra');
assert(ultraResult.allowed === true, 'Ultra user handleExportCsv succeeds');
assert(ultraResult.csv !== null, 'Ultra user receives valid CSV');

// ADMIN simulating FREE invocation test
const adminSimFreeResult = simulateHandleExportCsv(adminSimFreePlan.id);
assert(adminSimFreeResult.allowed === false, 'Admin simulating Free handleExportCsv is blocked');
assert(adminSimFreeResult.csv === null, 'Admin simulating Free generates no CSV');

// ADMIN simulating PRO invocation test
const adminSimProResult = simulateHandleExportCsv(adminSimProPlan.id);
assert(adminSimProResult.allowed === true, 'Admin simulating Pro handleExportCsv succeeds');
assert(adminSimProResult.csv !== null, 'Admin simulating Pro receives valid CSV');

// ----------------------------------------------------
// 12. Ultra Business Forecast Module Gating (Ultra / Admin Exclusive)
// ----------------------------------------------------
console.log('\n--- 12. Ultra Business Forecast Module Gating (Ultra / Admin Exclusive) ---');

// 1. Direct canAccessBusinessForecast function checks
assert(canAccessBusinessForecast('free') === false, 'FREE tier: canAccessBusinessForecast is false (blocked)');
assert(canAccessBusinessForecast('pro') === false, 'PRO tier: canAccessBusinessForecast is false (blocked)');
assert(canAccessBusinessForecast('ultra') === true, 'ULTRA tier: canAccessBusinessForecast is true (allowed)');
assert(canAccessBusinessForecast('admin') === true, 'ADMIN tier: canAccessBusinessForecast is true (allowed)');
assert(canAccessBusinessForecast(undefined) === false, 'undefined plan: canAccessBusinessForecast is false');
assert(canAccessBusinessForecast(null) === false, 'null plan: canAccessBusinessForecast is false');
assert(canAccessBusinessForecast('') === false, 'empty string: canAccessBusinessForecast is false');
assert(canAccessBusinessForecast('unknown') === false, 'unknown tier: canAccessBusinessForecast is false');

// 2. Navigation & Module access for regular users
assert(
  canAccessBusinessForecast(regularFreePlan.id) === false,
  'Regular FREE user: Forecast is hidden from navigation and blocked in module'
);
assert(
  canAccessBusinessForecast(regularProPlan.id) === false,
  'Regular PRO user: Forecast is hidden from navigation and blocked in module'
);
assert(
  canAccessBusinessForecast(regularUltraPlan.id) === true,
  'Regular ULTRA user: Forecast is visible in navigation and accessible in module'
);

// 3. Tampering attempt by non-admin
assert(
  canAccessBusinessForecast(tamperedFreePlan.id) === false,
  'Non-admin tampering with simulatedTier is ignored; Forecast remains strictly blocked'
);

// 4. Admin identity and simulation mode
assert(
  canAccessBusinessForecast(adminDefaultPlan.id) === true,
  'Admin default mode: Forecast is visible and fully accessible'
);
assert(
  canAccessBusinessForecast(adminSimFreePlan.id) === false,
  'Admin simulating FREE: Forecast is hidden from navigation and blocked in module'
);
assert(
  canAccessBusinessForecast(adminSimProPlan.id) === false,
  'Admin simulating PRO: Forecast is hidden from navigation and blocked in module'
);
assert(
  canAccessBusinessForecast(adminSimUltraPlan.id) === true,
  'Admin simulating ULTRA: Forecast is visible in navigation and accessible in module'
);

// 5. Direct Module Access Gate Simulation (verifying BusinessForecastModule render check)
function simulateModuleAccessGate(planId: string) {
  const isAuthorized = canAccessBusinessForecast(planId);
  if (!isAuthorized) {
    return {
      isAuthorized: false,
      view: 'locked',
      title: 'Aqlli biznes prognozi (Ultra Eksklyuziv)',
      badge: 'Faqat Ultra tarifida',
    };
  }
  return {
    isAuthorized: true,
    view: 'module_skeleton',
    title: 'Aqlli biznes prognozi',
    badge: 'ULTRA',
  };
}

const freeModuleAccess = simulateModuleAccessGate('free');
assert(freeModuleAccess.isAuthorized === false, 'Free user module access is unauthorized');
assert(freeModuleAccess.view === 'locked', 'Free user direct URL visit renders locked view');

const proModuleAccess = simulateModuleAccessGate('pro');
assert(proModuleAccess.isAuthorized === false, 'Pro user module access is unauthorized');
assert(proModuleAccess.view === 'locked', 'Pro user direct URL visit renders locked view');

const ultraModuleAccess = simulateModuleAccessGate('ultra');
assert(ultraModuleAccess.isAuthorized === true, 'Ultra user module access is authorized');
assert(ultraModuleAccess.view === 'module_skeleton', 'Ultra user direct URL visit renders forecast module');

const adminSimFreeAccess = simulateModuleAccessGate(adminSimFreePlan.id);
assert(adminSimFreeAccess.isAuthorized === false, 'Admin simulating Free access is unauthorized');
assert(adminSimFreeAccess.view === 'locked', 'Admin simulating Free renders locked view');

const adminSimProAccess = simulateModuleAccessGate(adminSimProPlan.id);
assert(adminSimProAccess.isAuthorized === false, 'Admin simulating Pro access is unauthorized');
assert(adminSimProAccess.view === 'locked', 'Admin simulating Pro renders locked view');

const adminSimUltraAccess = simulateModuleAccessGate(adminSimUltraPlan.id);
assert(adminSimUltraAccess.isAuthorized === true, 'Admin simulating Ultra access is authorized');
assert(adminSimUltraAccess.view === 'module_skeleton', 'Admin simulating Ultra renders forecast module');

console.log('\n====================================================');
console.log('TEST SECTION 13: ULTRA BUSINESS FORECAST CALCULATIONS');
console.log('====================================================\n');

// 1. Helper function getOrderActualPaid tests
const mockCancelledOrder: Order = {
  id: 'ord-c1',
  userId: 'test-admin-uid',
  customerId: 'cust-1',
  orderNumber: 'ORD-001',
  customerName: 'Test Customer',
  customerPhone: '+998901234567',
  items: [{ productId: 'p1', productName: 'P1', quantity: 2, unitPrice: 50000, totalPrice: 100000, unitCost: 30000, totalCost: 60000 }],
  totalAmount: 100000,
  totalCost: 60000,
  totalProfit: 40000,
  paidAmount: 100000,
  paymentStatus: 'paid',
  status: 'cancelled',
  stockDeducted: false,
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z',
};

const mockDraftOrder: Order = {
  id: 'ord-d1',
  userId: 'test-admin-uid',
  customerId: 'cust-1',
  orderNumber: 'ORD-000',
  customerName: 'Draft Customer',
  customerPhone: '+998901234567',
  items: [{ productId: 'p1', productName: 'P1', quantity: 10, unitPrice: 50000, totalPrice: 500000, unitCost: 30000, totalCost: 300000 }],
  totalAmount: 500000,
  totalCost: 300000,
  totalProfit: 200000,
  paidAmount: 500000,
  paymentStatus: 'paid',
  status: 'draft',
  stockDeducted: false,
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z',
};

const mockPaidOrder: Order = {
  id: 'ord-p1',
  userId: 'test-admin-uid',
  customerId: 'cust-2',
  orderNumber: 'ORD-002',
  customerName: 'Test Customer 2',
  customerPhone: '+998901234568',
  items: [{ productId: 'p1', productName: 'P1', quantity: 1, unitPrice: 200000, totalPrice: 200000, unitCost: 120000, totalCost: 120000 }],
  totalAmount: 200000,
  totalCost: 120000,
  totalProfit: 80000,
  paidAmount: 200000,
  paymentStatus: 'paid',
  status: 'confirmed',
  stockDeducted: true,
  createdAt: '2026-03-02T10:00:00.000Z',
  updatedAt: '2026-03-02T10:00:00.000Z',
};

const mockPartiallyPaidOrder: Order = {
  id: 'ord-part1',
  userId: 'test-admin-uid',
  customerId: 'cust-3',
  orderNumber: 'ORD-003',
  customerName: 'Test Customer 3',
  customerPhone: '+998901234569',
  items: [{ productId: 'p2', productName: 'P2', quantity: 1, unitPrice: 300000, totalPrice: 300000, unitCost: 180000, totalCost: 180000 }],
  totalAmount: 300000,
  totalCost: 180000,
  totalProfit: 120000,
  paidAmount: 100000,
  paymentStatus: 'partially_paid',
  status: 'confirmed',
  stockDeducted: true,
  createdAt: '2026-03-03T10:00:00.000Z',
  updatedAt: '2026-03-03T10:00:00.000Z',
};

const mockUnpaidOrder: Order = {
  id: 'ord-u1',
  userId: 'test-admin-uid',
  customerId: 'cust-4',
  orderNumber: 'ORD-004',
  customerName: 'Test Customer 4',
  customerPhone: '+998901234570',
  items: [{ productId: 'p2', productName: 'P2', quantity: 1, unitPrice: 400000, totalPrice: 400000, unitCost: 250000, totalCost: 250000 }],
  totalAmount: 400000,
  totalCost: 250000,
  totalProfit: 150000,
  paidAmount: 0,
  paymentStatus: 'unpaid',
  status: 'confirmed',
  stockDeducted: true,
  createdAt: '2026-03-04T10:00:00.000Z',
  updatedAt: '2026-03-04T10:00:00.000Z',
};

assert(getOrderActualPaid(mockCancelledOrder) === 0, 'Cancelled order returns 0 paid amount');
assert(getOrderActualPaid(mockDraftOrder) === 0, 'REGRESSION TEST 1: Draft order returns 0 paid amount');
assert(getOrderActualPaid(mockPaidOrder) === 200000, 'Fully paid order returns correct paid amount');
assert(getOrderActualPaid(mockPartiallyPaidOrder) === 100000, 'Partially paid order returns collected portion');
assert(getOrderActualPaid(mockUnpaidOrder) === 0, 'REGRESSION TEST 2: Unpaid confirmed order returns 0 paid cash revenue');

// 2. Revenue Forecast (calculateRevenueForecast)
// 2.1 Gate authorization
const revFree = calculateRevenueForecast([mockPaidOrder], 'free');
assert(revFree.isAuthorized === false, 'Revenue forecast: Free plan is blocked');
assert(revFree.hasSufficientData === false, 'Revenue forecast: Blocked plan returns hasSufficientData=false');

const revPro = calculateRevenueForecast([mockPaidOrder], 'pro');
assert(revPro.isAuthorized === false, 'Revenue forecast: Pro plan is blocked');

const revUltraAuth = calculateRevenueForecast([], 'ultra');
assert(revUltraAuth.isAuthorized === true, 'Revenue forecast: Ultra plan is authorized');

// 2.2 Insufficient data tests (MIN_HISTORICAL_ORDERS = 5, MIN_HISTORICAL_DAYS = 14)
const revNoOrders = calculateRevenueForecast([], 'ultra');
assert(revNoOrders.hasSufficientData === false, 'Empty orders: hasSufficientData is false');
assert(revNoOrders.projected30DayPaidRevenue === 0, 'Empty orders: projected revenue is 0');
assert(revNoOrders.growthRatePercent === null, 'Empty orders: growthRatePercent is null');

// Orders with fewer than MIN_HISTORICAL_ORDERS (4 orders)
const revFewOrders = calculateRevenueForecast([
  { ...mockPaidOrder, id: 'o1', createdAt: '2026-03-01T10:00:00.000Z' },
  { ...mockPaidOrder, id: 'o2', createdAt: '2026-03-05T10:00:00.000Z' },
  { ...mockPaidOrder, id: 'o3', createdAt: '2026-03-10T10:00:00.000Z' },
  { ...mockPaidOrder, id: 'o4', createdAt: '2026-03-16T10:00:00.000Z' },
], 'ultra');
assert(revFewOrders.hasSufficientData === false, 'Fewer than 5 orders returns hasSufficientData=false');
assert(revFewOrders.sampleSizeOrders === 4, 'Sample size accurately records 4 orders');

// Orders spanning fewer than MIN_HISTORICAL_DAYS (5 orders all within 10 days)
const revShortSpan = calculateRevenueForecast([
  { ...mockPaidOrder, id: 'o1', createdAt: '2026-03-01T10:00:00.000Z' },
  { ...mockPaidOrder, id: 'o2', createdAt: '2026-03-03T10:00:00.000Z' },
  { ...mockPaidOrder, id: 'o3', createdAt: '2026-03-05T10:00:00.000Z' },
  { ...mockPaidOrder, id: 'o4', createdAt: '2026-03-07T10:00:00.000Z' },
  { ...mockPaidOrder, id: 'o5', createdAt: '2026-03-10T10:00:00.000Z' },
], 'ultra');
assert(revShortSpan.hasSufficientData === false, 'Orders spanning < 14 days returns hasSufficientData=false');

// Draft & Cancelled orders must be excluded from valid orders count
const revWithDraftAndCancelled = calculateRevenueForecast([
  { ...mockPaidOrder, id: 'o1', createdAt: '2026-03-01T10:00:00.000Z' },
  { ...mockPaidOrder, id: 'o2', createdAt: '2026-03-16T10:00:00.000Z' },
  { ...mockDraftOrder, id: 'd1', createdAt: '2026-03-05T10:00:00.000Z' },
  { ...mockCancelledOrder, id: 'c1', createdAt: '2026-03-08T10:00:00.000Z' },
], 'ultra');
assert(revWithDraftAndCancelled.sampleSizeOrders === 2, 'Draft & Cancelled orders strictly excluded from sample count');
assert(revWithDraftAndCancelled.hasSufficientData === false, 'Excluding draft & cancelled orders correctly triggers insufficient data gate');

// 2.3 Sufficient historical data calculation
// 5 confirmed/delivered orders spanning 15 days (2026-03-01 to 2026-03-16)
// Total paid revenue: 500,000 + 1,000,000 + 1,500,000 + 2,000,000 + 0 (unpaid) = 5,000,000
const order1: Order = { ...mockPaidOrder, id: 'o1', paidAmount: 500000, totalAmount: 500000, createdAt: '2026-03-01T10:00:00.000Z' };
const order2: Order = { ...mockPaidOrder, id: 'o2', paidAmount: 1000000, totalAmount: 1000000, createdAt: '2026-03-05T10:00:00.000Z' };
const order3: Order = { ...mockPaidOrder, id: 'o3', paidAmount: 1500000, totalAmount: 1500000, createdAt: '2026-03-09T10:00:00.000Z' };
const order4: Order = { ...mockPaidOrder, id: 'o4', paidAmount: 2000000, totalAmount: 2000000, createdAt: '2026-03-12T10:00:00.000Z' };
const order5: Order = { ...mockUnpaidOrder, id: 'o5', paidAmount: 0, totalAmount: 1000000, createdAt: '2026-03-16T10:00:00.000Z' };

const revSufficient = calculateRevenueForecast([order1, order2, order3, order4, order5], 'ultra');
assert(revSufficient.hasSufficientData === true, 'Sufficient 5 orders over 15 days returns hasSufficientData=true');
assert(revSufficient.sampleSizeOrders === 5, 'Sample size correctly counted as 5 confirmed orders');
assert(revSufficient.historicalDaysSpan === 15, 'Historical days span correctly computed as 15 days');
assert(revSufficient.totalHistoricalPaidRevenue === 5000000, 'Historical paid revenue matches exactly 5,000,000 (excluding unpaid order 5)');
assert(revSufficient.dailyRunRatePaidRevenue === Math.round(5000000 / 15), 'Daily run rate is 333,333 sum/day');
assert(revSufficient.projected30DayPaidRevenue === Math.round((5000000 / 15) * 30), '30-day projection is 10,000,000 sum');

// 3. Warehouse Needs & Stock Depletion (calculateWarehouseNeedsForecast)
const mockProducts: Product[] = [
  {
    id: 'prod-out-of-stock',
    userId: 'test-admin-uid',
    name: 'Tugagan Mahsulot A',
    sku: 'SKU-001',
    category: 'Xomashyo',
    quantity: 0,
    unit: 'dona',
    minStockAlert: 10,
    purchasePrice: 20000,
    sellingPrice: 35000,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-low-stock',
    userId: 'test-admin-uid',
    name: 'Kam Qolgan Mahsulot B',
    sku: 'SKU-002',
    category: 'Tayyor mahsulot',
    quantity: 5,
    unit: 'kg',
    minStockAlert: 10,
    purchasePrice: 50000,
    sellingPrice: 80000,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-adequate',
    userId: 'test-admin-uid',
    name: 'Yetarli Mahsulot C',
    sku: 'SKU-003',
    category: 'Tayyor mahsulot',
    quantity: 100,
    unit: 'dona',
    minStockAlert: 10,
    purchasePrice: 15000,
    sellingPrice: 25000,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

// 3.1 Authorization gate
const whFree = calculateWarehouseNeedsForecast(mockProducts, [], 'free');
assert(whFree.isAuthorized === false, 'Warehouse forecast: Free plan is blocked');
const whUltra = calculateWarehouseNeedsForecast(mockProducts, [], 'ultra');
assert(whUltra.isAuthorized === true, 'Warehouse forecast: Ultra plan is authorized');

// 3.2 Product status tests without sales history (REGRESSION TEST 4: zero velocity -> recommendedReorderQuantity = 0)
assert(whUltra.criticalStockCount === 1, 'Critical stock count accurately identified 1 zero-stock product');
assert(whUltra.warningStockCount === 1, 'Warning stock count accurately identified 1 low-stock product');

const itemOut = whUltra.items.find(i => i.productId === 'prod-out-of-stock')!;
assert(itemOut.urgencyStatus === 'critical', 'Zero stock product classified as critical');
assert(itemOut.estimatedDaysUntilStockout === 0, 'Zero stock product estimatedDaysUntilStockout is 0');
assert(itemOut.recommendedReorderQuantity === 10, 'Zero stock product recommends replenishing up to minStockAlert (10)');

const itemAdequate = whUltra.items.find(i => i.productId === 'prod-adequate')!;
assert(itemAdequate.urgencyStatus === 'adequate', 'Ample stock product classified as adequate');
assert(itemAdequate.estimatedDaysUntilStockout === null, 'No sales velocity does not invent artificial stockout date');
assert(itemAdequate.recommendedReorderQuantity === 0, 'REGRESSION TEST 4: Zero sales velocity on ample stock results in 0 reorder recommendation (does not force 2x minAlert)');

// 3.3 Sales velocity calculations with 5 valid confirmed orders spanning 15 days
// Product B sells 30 units across 15 days with 5 valid orders => 2 units/day. Current stock is 5 => 2 days until stockout!
const whOrder1: Order = { ...mockPaidOrder, id: 'wo1', items: [{ productId: 'prod-low-stock', productName: 'Kam Qolgan B', quantity: 6, unitPrice: 80000, totalPrice: 480000, unitCost: 50000, totalCost: 300000 }], createdAt: '2026-03-01T10:00:00.000Z' };
const whOrder2: Order = { ...mockPaidOrder, id: 'wo2', items: [{ productId: 'prod-low-stock', productName: 'Kam Qolgan B', quantity: 6, unitPrice: 80000, totalPrice: 480000, unitCost: 50000, totalCost: 300000 }], createdAt: '2026-03-05T10:00:00.000Z' };
const whOrder3: Order = { ...mockPaidOrder, id: 'wo3', items: [{ productId: 'prod-low-stock', productName: 'Kam Qolgan B', quantity: 6, unitPrice: 80000, totalPrice: 480000, unitCost: 50000, totalCost: 300000 }], createdAt: '2026-03-09T10:00:00.000Z' };
const whOrder4: Order = { ...mockPaidOrder, id: 'wo4', items: [{ productId: 'prod-low-stock', productName: 'Kam Qolgan B', quantity: 6, unitPrice: 80000, totalPrice: 480000, unitCost: 50000, totalCost: 300000 }], createdAt: '2026-03-12T10:00:00.000Z' };
const whOrder5: Order = { ...mockPaidOrder, id: 'wo5', items: [{ productId: 'prod-low-stock', productName: 'Kam Qolgan B', quantity: 6, unitPrice: 80000, totalPrice: 480000, unitCost: 50000, totalCost: 300000 }], createdAt: '2026-03-16T10:00:00.000Z' };

// Add draft and cancelled orders that MUST NOT increase sales velocity
const whOrderDraft: Order = { ...mockDraftOrder, id: 'wod1', items: [{ productId: 'prod-low-stock', productName: 'Kam Qolgan B', quantity: 100, unitPrice: 80000, totalPrice: 8000000, unitCost: 50000, totalCost: 5000000 }], createdAt: '2026-03-02T10:00:00.000Z' };
const whOrderCancelled: Order = { ...mockCancelledOrder, id: 'woc1', items: [{ productId: 'prod-low-stock', productName: 'Kam Qolgan B', quantity: 50, unitPrice: 80000, totalPrice: 4000000, unitCost: 50000, totalCost: 2500000 }], createdAt: '2026-03-05T10:00:00.000Z' };

const whWithSales = calculateWarehouseNeedsForecast(mockProducts, [whOrder1, whOrder2, whOrder3, whOrder4, whOrder5, whOrderDraft, whOrderCancelled], 'ultra');
const itemWithSales = whWithSales.items.find(i => i.productId === 'prod-low-stock')!;
assert(itemWithSales.totalUnitsSold === 30, 'Draft & Cancelled order items strictly excluded from units sold (30 units, not 180)');
assert(itemWithSales.dailySalesVelocity === 2, 'Daily sales velocity computed as 30 units / 15 days = 2 units/day');
assert(itemWithSales.estimatedDaysUntilStockout === 2, 'Days until stockout computed as floor(5 / 2) = 2 days');
assert(itemWithSales.urgencyStatus === 'critical', 'Product running out in 2 days escalated to critical status');
// 30-day demand = 2 * 30 = 60. Target buffer = 10 + 60 = 70. Stock = 5 => Reorder = 65 units.
assert(itemWithSales.recommendedReorderQuantity === 65, 'Reorder quantity accurately computed as target (10 + 60) - 5 stock = 65 units');

// 4. Cash Flow Forecast (calculateCashFlowForecast)
// 4.1 Authorization gate
const cfFree = calculateCashFlowForecast([], [], 'free');
assert(cfFree.isAuthorized === false, 'Cash flow forecast: Free plan is blocked');

// 4.2 Cautious debt vs cash separation
const debtOrder1: Order = { ...mockPartiallyPaidOrder, id: 'do1', totalAmount: 1000000, paidAmount: 400000, createdAt: '2026-03-01T10:00:00.000Z' };
const debtOrder2: Order = { ...mockPartiallyPaidOrder, id: 'do2', totalAmount: 1000000, paidAmount: 400000, createdAt: '2026-03-05T10:00:00.000Z' };
const debtOrder3: Order = { ...mockUnpaidOrder, id: 'do3', totalAmount: 500000, paidAmount: 0, createdAt: '2026-03-09T10:00:00.000Z' };
const debtOrder4: Order = { ...mockPaidOrder, id: 'do4', totalAmount: 1000000, paidAmount: 1000000, createdAt: '2026-03-12T10:00:00.000Z' };
const debtOrder5: Order = { ...mockPaidOrder, id: 'do5', totalAmount: 1000000, paidAmount: 1000000, createdAt: '2026-03-16T10:00:00.000Z' };

const cfDebtTest = calculateCashFlowForecast([debtOrder1, debtOrder2, debtOrder3, debtOrder4, debtOrder5], [], 'ultra');
assert(cfDebtTest.isAuthorized === true, 'Cash flow forecast: Ultra plan is authorized');
assert(cfDebtTest.unpaidDebtOutstanding === 1700000, 'Unpaid debt correctly identified as 1,700,000 sum (600k + 600k + 500k)');

// 4.3 REGRESSION TEST 3: Short 1-day interval expense entries MUST NOT explode artificially by 30x
const mockConsecutiveDayExpenses: FinancialTransaction[] = [
  {
    id: 'tx-exp1',
    userId: 'test-admin-uid',
    type: 'expense',
    category: 'ijara',
    amount: 1500000, // Monthly rent
    date: '2026-03-01',
    description: 'Ofis ijarasi',
    createdAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'tx-exp2',
    userId: 'test-admin-uid',
    type: 'expense',
    category: 'kommunal',
    amount: 50000, // Electricity bill entered next day
    date: '2026-03-02',
    description: 'Elektr energiyasi',
    createdAt: '2026-03-02T00:00:00.000Z',
  },
];

const cfShortInterval = calculateCashFlowForecast([order1, order2, order3, order4, order5], mockConsecutiveDayExpenses, 'ultra');
assert(cfShortInterval.totalHistoricalExpenses === 1550000, 'Total historical expenses equal 1,550,000 sum');
// Effective span uses at least a 30-day baseline cycle (or revenue span 15 days, max 30) -> 1,550,000 / 30 = 51,667 sum/day -> projected 1,550,000 sum
assert(cfShortInterval.projected30DayExpenses === 1550000, 'REGRESSION TEST 3: 2 expenses entered 1 day apart do NOT explode to 46.5M UZS; safely baseline to 1,550,000 sum');
assert(cfShortInterval.dailyExpenseBurnRate === Math.round(1550000 / 30), 'Daily expense burn rate is ~51,667 sum/day based on 30-day baseline');

// 4.4 No expense history fallback
const cfNoExpenses = calculateCashFlowForecast([order1, order2, order3, order4, order5], [], 'ultra');
assert(cfNoExpenses.hasExpenseHistory === false, 'Absence of expenses clearly flagged');
assert(cfNoExpenses.projected30DayExpenses === 0, 'Zero expenses projected without fabricating imaginary overhead');
assert(cfNoExpenses.expenseAssumptionsNote.includes('operatsion xarajat kiritilmagan'), 'Disclosure notes historical absence of expenses');

// 5. Unified generateBusinessForecast wrapper tests
const unifiedFree = generateBusinessForecast([order1, order2, order3, order4, order5], mockConsecutiveDayExpenses, mockProducts, 'free');
assert(unifiedFree.isAuthorized === false, 'Unified forecast: Free tier is blocked');
assert(unifiedFree.revenue.isAuthorized === false, 'Unified forecast: Free revenue child blocked');
assert(unifiedFree.warehouse.isAuthorized === false, 'Unified forecast: Free warehouse child blocked');
assert(unifiedFree.cashFlow.isAuthorized === false, 'Unified forecast: Free cash flow child blocked');

const unifiedUltra = generateBusinessForecast([order1, order2, order3, order4, order5], mockConsecutiveDayExpenses, mockProducts, 'ultra');
assert(unifiedUltra.isAuthorized === true, 'Unified forecast: Ultra tier is authorized');
assert(unifiedUltra.revenue.isAuthorized === true, 'Unified forecast: Ultra revenue child authorized');
assert(unifiedUltra.revenue.projected30DayPaidRevenue === 10000000, 'Unified forecast: Revenue calculation returns accurate projection');
assert(unifiedUltra.warehouse.itemsNeedingReorderCount >= 1, 'Unified forecast: Warehouse calculation returns reorder needs');
assert(unifiedUltra.cashFlow.isAuthorized === true, 'Unified forecast: Cash flow child authorized');

// 6. Admin simulation testing on generateBusinessForecast
const adminSimFreeUnified = generateBusinessForecast([order1, order2, order3, order4, order5], mockConsecutiveDayExpenses, mockProducts, adminSimFreePlan.id);
assert(adminSimFreeUnified.isAuthorized === false, 'Admin simulating Free: Unified forecast is strictly blocked');

const adminSimProUnified = generateBusinessForecast([order1, order2, order3, order4, order5], mockConsecutiveDayExpenses, mockProducts, adminSimProPlan.id);
assert(adminSimProUnified.isAuthorized === false, 'Admin simulating Pro: Unified forecast is strictly blocked');

const adminSimUltraUnified = generateBusinessForecast([order1, order2, order3, order4, order5], mockConsecutiveDayExpenses, mockProducts, adminSimUltraPlan.id);
assert(adminSimUltraUnified.isAuthorized === true, 'Admin simulating Ultra: Unified forecast is authorized and active');

console.log('\n====================================================');
console.log('🏁 ALL TESTS PASSED: REGRESSION & AUDIT FIXES CONFIRMED!');
console.log('====================================================\n');

