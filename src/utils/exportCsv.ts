/**
 * BiznesYordam - Safe CSV Export Utility
 * 
 * Features:
 * 1. UTF-8 BOM (\uFEFF) inclusion for seamless Excel Uzbek Latin/Cyrillic compatibility.
 * 2. RFC 4180 compliant escaping (commas, quotes, newlines).
 * 3. CSV / DDE Formula Injection protection (=, +, -, @) without corrupting genuine negative numbers.
 * 4. Deterministic column ordering and custom cell formatters.
 * 5. Safe handling of null, undefined, zero, and special characters.
 * 6. Pure, SSR-safe converter + browser download trigger.
 */

export type CsvColumnType = 'text' | 'number' | 'date';

export interface CsvColumn<T = any> {
  key: keyof T | string;
  header: string;
  type?: CsvColumnType;
  formatter?: (value: any, row: T) => string | number | boolean | Date | null | undefined;
}

export interface EscapeOptions {
  type?: CsvColumnType;
}

/**
 * Checks if a value represents a genuine finite number.
 * Real numbers (positive or negative) should not be mangled by formula injection escaping.
 */
export function isRealNumber(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return false;
    // Strictly matches standard isolated numbers (e.g., -5000, 120.5, -0.75, 0)
    // Does NOT match expressions like "-1+1", "-cmd", "+abc"
    return /^-?\d+(\.\d+)?$/.test(trimmed);
  }
  return false;
}

/**
 * Escapes a single cell value for CSV output:
 * - Converts null/undefined to empty string.
 * - Formats Date and boolean objects cleanly.
 * - Protects against CSV Formula / DDE Injection (=, +, -, @, |) even if preceded by
 *   leading spaces, tabs, newlines, or control characters.
 * - Differentiates real negative numbers from malicious text formulas.
 * - If column type is explicitly 'text', preserves text strings as text without numeric coercion.
 * - Wraps fields in double quotes if they contain commas, quotes, newlines, tabs, spaces, or formula prefixes.
 * - Doubles internal quotes (" -> "").
 */
export function escapeCsvCell(value: unknown, options?: EscapeOptions): string {
  if (value === null || value === undefined) {
    return '';
  }

  // Handle Date objects
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Handle Boolean values
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  // Handle genuine numbers directly
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    return String(value);
  }

  let str = String(value);
  if (str === '') {
    return '';
  }

  // If column is explicitly typed as 'number' and value is a valid numeric string, output cleanly
  if (options?.type === 'number' && isRealNumber(str)) {
    return str.trim();
  }

  // If column is explicitly 'text', do NOT treat numeric strings (like phone +998... or -0012) as raw numbers
  const isExplicitText = options?.type === 'text';

  // If untyped and represents a genuine clean number, preserve as number
  if (!isExplicitText && isRealNumber(str)) {
    return str.trim();
  }

  // Comprehensive CSV Formula Injection (DDE) Detection:
  // Threat vectors: Strings that start with =, +, -, @, | even if preceded by spaces, tabs, CR, LF, or control characters
  const trimmedLeading = str.replace(/^[\s\u0000-\u001f]+/, '');
  const firstCharAfterLeadingWhitespace = trimmedLeading.charAt(0);
  const rawFirstChar = str.charAt(0);

  const isDangerousStartChar = ['=', '+', '-', '@', '|'].includes(firstCharAfterLeadingWhitespace);
  const rawStartsWithControl = /^[\t\r\n]/.test(rawFirstChar);

  const isFormulaTrigger = isDangerousStartChar || rawStartsWithControl;

  if (isFormulaTrigger) {
    // OWASP recommendation: prefix with a single quote (') so spreadsheet engines treat it strictly as text
    str = `'${str}`;
  }

  // Check if cell needs to be wrapped in double quotes
  const needsQuotes =
    isFormulaTrigger ||
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r') ||
    str.includes('\t') ||
    str.startsWith(' ') ||
    str.endsWith(' ');

  if (needsQuotes) {
    // Escape existing double quotes by doubling them
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Converts an array of objects into an RFC 4180 compliant CSV string.
 * Prepends UTF-8 BOM (\uFEFF) by default to ensure Microsoft Excel correctly displays
 * Uzbek Latin and Cyrillic characters (e.g. O‘zbekiston, To'lov, Ҳисобот).
 */
export function convertToCsv<T = any>(
  data: T[],
  columns: CsvColumn<T>[],
  options?: { includeBom?: boolean }
): string {
  const includeBom = options?.includeBom ?? true;
  const bom = includeBom ? '\uFEFF' : '';

  // 1. Header row
  const headerRow = columns.map((col) => escapeCsvCell(col.header, { type: 'text' })).join(',');

  // 2. Data rows
  const dataRows = data.map((row) => {
    return columns
      .map((col) => {
        const rawValue = (row as any)?.[col.key];
        const formattedValue = col.formatter
          ? col.formatter(rawValue, row)
          : rawValue;
        return escapeCsvCell(formattedValue, { type: col.type });
      })
      .join(',');
  });

  const content = [headerRow, ...dataRows].join('\r\n');
  return bom + content;
}

/**
 * Triggers a browser download of the CSV content.
 * Safe to import in SSR/Node.js environments (no-op if window/document is undefined).
 * Sanitizes filename to prevent path traversal or invalid characters.
 */
export function downloadCsv(filename: string, csvContent: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // Sanitize filename
  const cleanName = filename.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'export';
  const safeFilename = cleanName.endsWith('.csv') ? cleanName : `${cleanName}.csv`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', safeFilename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface FinanceReportMetrics {
  paidRevenue: number;
  unpaidDebt: number;
  costOfGoodsSold: number;
  totalExpenses: number;
  estimatedNetProfit: number;
  profitMarginPercent: number;
  orderCount: number;
  expenseCount: number;
}

export interface FinanceReportExpense {
  id?: string;
  date: string;
  category: string;
  description?: string;
  amount: number;
}

export interface FinanceReportOrderItem {
  productName: string;
  quantity?: number;
}

export interface FinanceReportOrder {
  id?: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  items?: FinanceReportOrderItem[];
  totalAmount?: number;
  paidAmount?: number;
  totalCost?: number;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
}

export interface FinanceReportParams {
  dateRangeLabel: string;
  metrics: FinanceReportMetrics;
  expenses?: FinanceReportExpense[];
  orders?: FinanceReportOrder[];
}

/**
 * Builds a comprehensive, RFC 4180 compliant Financial Report CSV.
 * Includes:
 * 1. High-level financial summary metrics (Date range, paid revenue, unpaid debt, COGS, expenses, estimated net profit, margin).
 * 2. Filtered operational expenses.
 * 3. Filtered sales orders (including customer names, phone numbers, products, amounts).
 * 
 * Enforces strict typing (type: 'text' vs type: 'number') so customer names, phone numbers,
 * or product names can NEVER trigger CSV formula injection (=, +, -, @, |).
 */
export function buildFinanceReportCsv(params: FinanceReportParams): string {
  const sections: string[] = [];

  // Section 1: Summary Table
  const summaryColumns: CsvColumn[] = [
    { key: 'period', header: "Sana oralig'i", type: 'text' },
    { key: 'paidRevenue', header: "To'langan tushum", type: 'number' },
    { key: 'unpaidDebt', header: "Qolgan qarzdorlik", type: 'number' },
    { key: 'costOfGoodsSold', header: "Mahsulot tannarxi (COGS)", type: 'number' },
    { key: 'totalExpenses', header: "Operatsion xarajatlar", type: 'number' },
    { key: 'estimatedNetProfit', header: "Taxminiy sof foyda", type: 'number' },
    { key: 'profitMarginPercent', header: "Rentabellik marjasi (%)", type: 'number' },
    { key: 'orderCount', header: "Buyurtmalar soni", type: 'number' },
    { key: 'expenseCount', header: "Xarajatlar soni", type: 'number' },
  ];

  const summaryRow = {
    period: params.dateRangeLabel || "Barcha davr",
    paidRevenue: params.metrics.paidRevenue,
    unpaidDebt: params.metrics.unpaidDebt,
    costOfGoodsSold: params.metrics.costOfGoodsSold,
    totalExpenses: params.metrics.totalExpenses,
    estimatedNetProfit: params.metrics.estimatedNetProfit,
    profitMarginPercent: params.metrics.profitMarginPercent,
    orderCount: params.metrics.orderCount,
    expenseCount: params.metrics.expenseCount,
  };

  const summaryCsv = convertToCsv([summaryRow], summaryColumns, { includeBom: false });
  sections.push(summaryCsv);

  // Section 2: Filtered Expenses Table
  if (params.expenses && params.expenses.length > 0) {
    const expenseColumns: CsvColumn[] = [
      { key: 'date', header: 'Sana', type: 'date' },
      { key: 'category', header: 'Kategoriya', type: 'text' },
      { key: 'description', header: 'Izoh / Tafsilot', type: 'text' },
      { key: 'amount', header: 'Summa', type: 'number' },
    ];

    const expenseRows = params.expenses.map((tx) => ({
      date: tx.date || '',
      category: tx.category || '',
      description: tx.description || '',
      amount: tx.amount || 0,
    }));

    const expensesCsv = convertToCsv(expenseRows, expenseColumns, { includeBom: false });
    const sectionHeader = escapeCsvCell("=== OPERATSION XARAJATLAR TAFSILOTI ===", { type: 'text' });
    sections.push(`${sectionHeader}\r\n${expensesCsv}`);
  }

  // Section 3: Filtered Orders Table
  if (params.orders && params.orders.length > 0) {
    const orderColumns: CsvColumn[] = [
      { key: 'date', header: 'Sana', type: 'date' },
      { key: 'orderNumber', header: 'Buyurtma #', type: 'text' },
      { key: 'customerName', header: 'Mijoz ismi', type: 'text' },
      { key: 'customerPhone', header: 'Mijoz telefoni', type: 'text' },
      { key: 'products', header: 'Mahsulotlar', type: 'text' },
      { key: 'totalAmount', header: 'Buyurtma summasi', type: 'number' },
      { key: 'paidAmount', header: "To'langan summa", type: 'number' },
      { key: 'debt', header: 'Qolgan qarz', type: 'number' },
      { key: 'totalCost', header: 'Tannarx (COGS)', type: 'number' },
      { key: 'status', header: 'Holati', type: 'text' },
      { key: 'paymentStatus', header: "To'lov holati", type: 'text' },
    ];

    const orderRows = params.orders.map((o) => {
      const orderDate = o.createdAt ? o.createdAt.slice(0, 10) : '';
      const totalAmt = Number(o.totalAmount) || 0;
      let actualPaid = 0;
      if (o.paymentStatus === 'paid') {
        actualPaid = typeof o.paidAmount === 'number' ? o.paidAmount : totalAmt;
      } else if (o.paymentStatus === 'partially_paid') {
        actualPaid = typeof o.paidAmount === 'number'
          ? Math.min(totalAmt, Math.max(0, o.paidAmount))
          : 0;
      }

      const debt = Math.max(0, totalAmt - actualPaid);
      const totalCost = Number(o.totalCost) || 0;
      const productsStr = (o.items || [])
        .map((it) => `${it.productName}${it.quantity ? ` (${it.quantity})` : ''}`)
        .join('; ');

      let statusLabel = o.status || '';
      if (o.status === 'delivered') statusLabel = 'Yetkazilgan';
      else if (o.status === 'confirmed') statusLabel = 'Tasdiqlangan';
      else if (o.status === 'draft') statusLabel = 'Qoralama';
      else if (o.status === 'cancelled') statusLabel = 'Bekor qilingan';

      let payLabel = o.paymentStatus || '';
      if (o.paymentStatus === 'paid') payLabel = "To'langan";
      else if (o.paymentStatus === 'partially_paid') payLabel = "Qisman to'langan";
      else if (o.paymentStatus === 'unpaid') payLabel = "To'lanmagan";

      return {
        date: orderDate,
        orderNumber: o.orderNumber || '',
        customerName: o.customerName || '',
        customerPhone: o.customerPhone || '',
        products: productsStr,
        totalAmount: totalAmt,
        paidAmount: actualPaid,
        debt,
        totalCost,
        status: statusLabel,
        paymentStatus: payLabel,
      };
    });

    const ordersCsv = convertToCsv(orderRows, orderColumns, { includeBom: false });
    const sectionHeader = escapeCsvCell("=== SOTUV VA BUYURTMALAR TAFSILOTI ===", { type: 'text' });
    sections.push(`${sectionHeader}\r\n${ordersCsv}`);
  }

  // Prepend UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility with Uzbek Latin & Cyrillic
  return '\uFEFF' + sections.join('\r\n\r\n');
}
