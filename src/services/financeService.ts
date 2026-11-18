/**
 * BiznesYordam - Financial Transactions & Analytics Service
 * Manages expense transactions at /users/{userId}/transactions/{transactionId}
 * Scoped strictly per authenticated user (ABAC/Owner-enforced).
 * 
 * Computes aggregate financial metrics (paid revenue, outstanding debt, COGS,
 * expenses, and estimated net profit) cleanly without duplicating order records.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logFirestoreOp } from './firebase';
import {
  FinancialTransaction,
  ExpenseCategory,
  ExpenseTransactionInput,
  Order,
} from '../types/business';
import { readScopedCache, writeScopedCache } from '../utils/userCache';

export interface FinanceSummaryMetrics {
  paidRevenue: number;         // Real qabul qilingan to'lovlar yig'indisi
  unpaidDebt: number;          // Qolgan kutilayotgan qarz/nasiya
  expectedSalesVolume: number; // Jami buyurtmalar hajmi (bekor qilinmagan)
  costOfGoodsSold: number;     // Ombordan amalda yechilgan tovarlar tannarxi (COGS)
  totalExpenses: number;       // Qo'lda kiritilgan jami xarajatlar
  estimatedNetProfit: number;  // Taxminiy sof foyda (tushum - COGS - xarajatlar)
  profitMarginPercent: number; // Tushumga nisbatan marja %
  orderCount: number;          // Qamrab olingan buyurtmalar soni
  expenseCount: number;        // Qamrab olingan xarajatlar soni
}

export const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string }[] = [
  { id: 'ijara', label: 'Ijara haqi' },
  { id: 'reklama', label: 'Reklama & Marketing' },
  { id: 'transport', label: 'Logistika & Transport' },
  { id: 'ish_haqi', label: 'Xodimlar ish haqi' },
  { id: 'mahsulot_xaridi', label: 'Mahsulot / Xomashyo xaridi' },
  { id: 'kommunal', label: 'Kommunal & Internet' },
  { id: 'boshqa', label: 'Boshqa xarajatlar' },
];

/**
 * Validates expense transaction input before creation or update
 */
export function validateExpenseInput(input: Partial<ExpenseTransactionInput>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  const valAmount = Number(input.amount);
  if (input.amount === undefined || isNaN(valAmount) || valAmount <= 0) {
    errors.push("Xarajat summasi 0 dan katta musbat son bo'lishi shart");
  }

  if (!input.date || !input.date.trim()) {
    errors.push("Sana ko'rsatilishi shart");
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(input.date.trim())) {
      errors.push("Sana YYYY-MM-DD formatida bo'lishi kerak");
    }
  }

  const validCategories: ExpenseCategory[] = ['ijara', 'reklama', 'transport', 'ish_haqi', 'mahsulot_xaridi', 'kommunal', 'boshqa'];
  if (!input.category || !validCategories.includes(input.category as ExpenseCategory)) {
    errors.push("Noto'g'ri xarajat kategoriyasi tanlandi");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Fetches all transactions for a given user from /users/{userId}/transactions
 */
export async function getTransactions(userId: string): Promise<FinancialTransaction[]> {
  if (!userId || !userId.trim()) return [];

  const collectionPath = `users/${userId}/transactions`;
  const txRef = collection(db, 'users', userId, 'transactions');
  const q = query(txRef, orderBy('date', 'desc'));

  try {
    const snapshot = await getDocs(q);
    const list: FinancialTransaction[] = [];
    snapshot.forEach((docSnap) => {
      list.push({
        id: docSnap.id,
        ...docSnap.data(),
      } as FinancialTransaction);
    });

    writeScopedCache('finance', userId, list);

    return list;
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.LIST, collectionPath);
    const cached = readScopedCache<FinancialTransaction[]>('finance', userId);
    if (Array.isArray(cached)) return cached;
    return [];
  }
}

/**
 * Creates a new expense transaction at /users/{userId}/transactions/{transactionId}
 */
export async function createExpense(
  userId: string,
  input: ExpenseTransactionInput
): Promise<FinancialTransaction> {
  if (!userId || !userId.trim()) {
    throw new Error("Foydalanuvchi tizimga kirmagan");
  }

  const validation = validateExpenseInput(input);
  if (!validation.isValid) {
    throw new Error(validation.errors.join('; '));
  }

  const txRef = collection(db, 'users', userId, 'transactions');
  const newDoc = doc(txRef);
  const now = new Date().toISOString();
  const docPath = `users/${userId}/transactions/${newDoc.id}`;

  const record: FinancialTransaction = {
    id: newDoc.id,
    userId,
    type: 'expense',
    category: input.category,
    amount: Math.abs(Number(input.amount)),
    description: input.description?.trim() || '',
    date: input.date.trim(),
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(newDoc, record);
    logFirestoreOp(OperationType.CREATE, docPath);
    return record;
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.CREATE, docPath);
    const errMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`Xarajat saqlanmadi: ${errMsg}`);
  }
}

/**
 * Updates an existing expense transaction at /users/{userId}/transactions/{transactionId}
 */
export async function updateExpense(
  userId: string,
  transactionId: string,
  input: ExpenseTransactionInput
): Promise<FinancialTransaction> {
  if (!userId || !transactionId) {
    throw new Error("Xarajat ID si berilmagan");
  }

  const validation = validateExpenseInput(input);
  if (!validation.isValid) {
    throw new Error(validation.errors.join('; '));
  }

  const docPath = `users/${userId}/transactions/${transactionId}`;
  const recordRef = doc(db, 'users', userId, 'transactions', transactionId);
  const now = new Date().toISOString();

  const updateData: Partial<FinancialTransaction> = {
    category: input.category,
    amount: Math.abs(Number(input.amount)),
    description: input.description?.trim() || '',
    date: input.date.trim(),
    updatedAt: now,
  };

  try {
    await updateDoc(recordRef, updateData);
    logFirestoreOp(OperationType.UPDATE, docPath);
    return {
      id: transactionId,
      userId,
      type: 'expense',
      ...updateData,
    } as FinancialTransaction;
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
    const errMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`Xarajat tahrirlanmadi: ${errMsg}`);
  }
}

/**
 * Deletes an expense transaction doc from /users/{userId}/transactions/{transactionId}
 */
export async function deleteExpense(userId: string, transactionId: string): Promise<void> {
  if (!userId || !transactionId) return;

  const docPath = `users/${userId}/transactions/${transactionId}`;
  const recordRef = doc(db, 'users', userId, 'transactions', transactionId);

  try {
    await deleteDoc(recordRef);
    logFirestoreOp(OperationType.DELETE, docPath);
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
    const errMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`Xarajat o'chirilmadi: ${errMsg}`);
  }
}

/**
 * Calculates aggregate financial metrics across sales orders and manual expenses.
 * Incorporates date filtering cleanly without missing or hallucinating dates.
 */
export function calculateFinanceMetrics(
  orders: Order[],
  transactions: FinancialTransaction[],
  dateRange?: { startDate?: string; endDate?: string }
): FinanceSummaryMetrics {
  let filteredOrders = orders;
  let filteredTx = transactions;

  if (dateRange?.startDate || dateRange?.endDate) {
    const start = dateRange.startDate || '1970-01-01';
    const end = dateRange.endDate || '2099-12-31';

    filteredOrders = orders.filter((o) => {
      const orderDate = o.createdAt ? o.createdAt.slice(0, 10) : '';
      return orderDate >= start && orderDate <= end;
    });

    filteredTx = transactions.filter((t) => {
      const txDate = t.date || (t.createdAt ? t.createdAt.slice(0, 10) : '');
      return txDate >= start && txDate <= end;
    });
  }

  let paidRevenue = 0;
  let unpaidDebt = 0;
  let expectedSalesVolume = 0;
  let costOfGoodsSold = 0;

  filteredOrders.forEach((order) => {
    // Exclude cancelled orders from all financial metrics
    if (order.status === 'cancelled') return;

    const totalAmt = Number(order.totalAmount) || 0;
    const totalCost = Number(order.totalCost) || 0;

    expectedSalesVolume += totalAmt;

    // COGS (Sotilgan tovarlar tannarxi) is calculated for confirmed/delivered orders where stock was deducted
    if (order.stockDeducted) {
      costOfGoodsSold += totalCost;
    }

    // Actual collected cash vs outstanding credit
    let actualPaid = 0;
    if (order.paymentStatus === 'paid') {
      actualPaid = typeof order.paidAmount === 'number' ? order.paidAmount : totalAmt;
    } else if (order.paymentStatus === 'partially_paid') {
      // If paidAmount is specified, count that exact amount. If missing, count 0 (never full totalAmt).
      actualPaid = typeof order.paidAmount === 'number'
        ? Math.min(totalAmt, Math.max(0, order.paidAmount))
        : 0;
    } else {
      // 'unpaid'
      actualPaid = 0;
    }

    paidRevenue += actualPaid;
    unpaidDebt += Math.max(0, totalAmt - actualPaid);
  });

  // Calculate sum of manual expenses
  let totalExpenses = 0;
  filteredTx.forEach((tx) => {
    if (tx.type === 'expense') {
      totalExpenses += Number(tx.amount) || 0;
    }
  });

  // Estimated Net Profit = Real Collected Revenue - Cost of Goods Sold - Expenses
  const estimatedNetProfit = paidRevenue - costOfGoodsSold - totalExpenses;
  const profitMarginPercent = paidRevenue > 0
    ? Math.round((estimatedNetProfit / paidRevenue) * 100)
    : 0;

  return {
    paidRevenue,
    unpaidDebt,
    expectedSalesVolume,
    costOfGoodsSold,
    totalExpenses,
    estimatedNetProfit,
    profitMarginPercent,
    orderCount: filteredOrders.filter((o) => o.status !== 'cancelled').length,
    expenseCount: filteredTx.filter((t) => t.type === 'expense').length,
  };
}
