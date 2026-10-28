/**
 * BiznesYordam - Ultra Business Forecast Analytics Service
 * 
 * Provides pure, deterministic, and unit-testable forecasting functions:
 * 1. 30-day Revenue Projection (calculateRevenueForecast)
 * 2. Warehouse Stock Depletion & Reorder Needs (calculateWarehouseNeedsForecast)
 * 3. 30-day Cautious Cash Flow Projection (calculateCashFlowForecast)
 * 
 * Enforces strict Ultra plan gating (canAccessBusinessForecast).
 * Never mutates data, never writes to Firestore, never calls external AI models.
 */

import { Order, FinancialTransaction } from '../types/business';
import { Product } from '../types/inventory';
import { canAccessBusinessForecast } from '../config/plans';

// Minimum requirements for statistical reliability
export const MIN_HISTORICAL_DAYS = 14;
export const MIN_HISTORICAL_ORDERS = 5;

export interface RevenueForecastResult {
  isAuthorized: boolean;
  hasSufficientData: boolean;
  sampleSizeOrders: number;
  historicalDaysSpan: number;
  totalHistoricalPaidRevenue: number;
  totalHistoricalSalesVolume: number;
  dailyRunRatePaidRevenue: number;
  dailyRunRateSalesVolume: number;
  projected30DayPaidRevenue: number;
  projected30DaySalesVolume: number;
  growthRatePercent: number | null; // null if prior period revenue was 0 (no artificial percentage growth)
  methodology: string;
  insufficientDataReason?: string;
}

export interface ProductStockForecastItem {
  productId: string;
  productName: string;
  currentStock: number;
  minStockAlert: number;
  unit: string;
  totalUnitsSold: number;
  dailySalesVelocity: number;
  hasSufficientVelocityHistory: boolean;
  estimatedDaysUntilStockout: number | null; // null if sales velocity is 0 or history is insufficient
  recommendedReorderQuantity: number;
  urgencyStatus: 'critical' | 'warning' | 'adequate';
  rationale: string;
}

export interface WarehouseForecastResult {
  isAuthorized: boolean;
  hasSufficientData: boolean;
  totalProductsChecked: number;
  itemsNeedingReorderCount: number;
  criticalStockCount: number;
  warningStockCount: number;
  items: ProductStockForecastItem[];
  methodology: string;
  insufficientDataReason?: string;
}

export interface CashFlowForecastResult {
  isAuthorized: boolean;
  hasSufficientData: boolean;
  historicalDaysSpan: number;
  projected30DayCashInflow: number;     // Based strictly on collected cash run-rate, NEVER counting unpaid debt as cash
  unpaidDebtOutstanding: number;         // Kept strictly separate as credit/debt, not cash inflow
  totalHistoricalExpenses: number;
  dailyExpenseBurnRate: number;
  projected30DayExpenses: number;       // Cautious extrapolation of operational expenses
  hasExpenseHistory: boolean;
  projectedNetCashFlow: number;          // projected30DayCashInflow - projected30DayExpenses
  cashDeficitWarning: boolean;
  expenseAssumptionsNote: string;
  methodology: string;
  insufficientDataReason?: string;
}

export interface UnifiedBusinessForecast {
  isAuthorized: boolean;
  revenue: RevenueForecastResult;
  warehouse: WarehouseForecastResult;
  cashFlow: CashFlowForecastResult;
}

/**
 * Helper to compute actual paid revenue from an order based on paymentStatus and paidAmount.
 * Strictly excludes cancelled and draft orders.
 * Unpaid confirmed/delivered orders return 0 paid revenue.
 */
export function getOrderActualPaid(order: Order): number {
  if (order.status === 'cancelled' || order.status === 'draft') return 0;
  const totalAmt = Number(order.totalAmount) || 0;
  if (order.paymentStatus === 'paid') {
    return typeof order.paidAmount === 'number' ? order.paidAmount : totalAmt;
  }
  if (order.paymentStatus === 'partially_paid') {
    return typeof order.paidAmount === 'number'
      ? Math.min(totalAmt, Math.max(0, order.paidAmount))
      : 0;
  }
  return 0; // 'unpaid'
}

/**
 * A) 30-Day Revenue Forecast
 * Analyzes confirmed/delivered orders over their historical date span.
 * Rejects predictions if sample size is < 5 orders or span < 14 days.
 * Avoids artificial growth percentages when prior period is 0.
 */
export function calculateRevenueForecast(
  orders: Order[],
  planId?: string | null
): RevenueForecastResult {
  if (!canAccessBusinessForecast(planId)) {
    return {
      isAuthorized: false,
      hasSufficientData: false,
      sampleSizeOrders: 0,
      historicalDaysSpan: 0,
      totalHistoricalPaidRevenue: 0,
      totalHistoricalSalesVolume: 0,
      dailyRunRatePaidRevenue: 0,
      dailyRunRateSalesVolume: 0,
      projected30DayPaidRevenue: 0,
      projected30DaySalesVolume: 0,
      growthRatePercent: null,
      methodology: "Ultra tarifi talab etiladi",
      insufficientDataReason: "Ushbu tahlil faqat Ultra tarifida mavjud",
    };
  }

  // Filter valid orders (strictly confirmed or delivered)
  const validOrders = orders.filter(
    (o) => (o.status === 'confirmed' || o.status === 'delivered') && o.createdAt
  );

  if (validOrders.length < MIN_HISTORICAL_ORDERS) {
    return {
      isAuthorized: true,
      hasSufficientData: false,
      sampleSizeOrders: validOrders.length,
      historicalDaysSpan: 0,
      totalHistoricalPaidRevenue: 0,
      totalHistoricalSalesVolume: 0,
      dailyRunRatePaidRevenue: 0,
      dailyRunRateSalesVolume: 0,
      projected30DayPaidRevenue: 0,
      projected30DaySalesVolume: 0,
      growthRatePercent: null,
      methodology: `Kamida ${MIN_HISTORICAL_ORDERS} ta tasdiqlangan/yetkazilgan buyurtma va ${MIN_HISTORICAL_DAYS} kunlik savdo tarixi talab etiladi`,
      insufficientDataReason: `Hozirda faqat ${validOrders.length} ta tasdiqlangan buyurtma mavjud. Ishonchli prognoz uchun kamida ${MIN_HISTORICAL_ORDERS} ta tasdiqlangan buyurtma kerak.`,
    };
  }

  // Determine chronological date span
  const timestamps = validOrders
    .map((o) => new Date(o.createdAt).getTime())
    .filter((t) => !isNaN(t))
    .sort((a, b) => a - b);

  if (timestamps.length === 0) {
    return {
      isAuthorized: true,
      hasSufficientData: false,
      sampleSizeOrders: validOrders.length,
      historicalDaysSpan: 0,
      totalHistoricalPaidRevenue: 0,
      totalHistoricalSalesVolume: 0,
      dailyRunRatePaidRevenue: 0,
      dailyRunRateSalesVolume: 0,
      projected30DayPaidRevenue: 0,
      projected30DaySalesVolume: 0,
      growthRatePercent: null,
      methodology: "Sana formati yaroqsiz",
      insufficientDataReason: "Buyurtmalar yaratilgan sanasi aniqlanmadi",
    };
  }

  const earliestMs = timestamps[0];
  const latestMs = timestamps[timestamps.length - 1];
  const diffDays = Math.ceil((latestMs - earliestMs) / (1000 * 60 * 60 * 24));
  const daysSpan = Math.max(1, diffDays);

  if (daysSpan < MIN_HISTORICAL_DAYS) {
    return {
      isAuthorized: true,
      hasSufficientData: false,
      sampleSizeOrders: validOrders.length,
      historicalDaysSpan: daysSpan,
      totalHistoricalPaidRevenue: 0,
      totalHistoricalSalesVolume: 0,
      dailyRunRatePaidRevenue: 0,
      dailyRunRateSalesVolume: 0,
      projected30DayPaidRevenue: 0,
      projected30DaySalesVolume: 0,
      growthRatePercent: null,
      methodology: `Kamida ${MIN_HISTORICAL_DAYS} kunlik savdo davri talab etiladi`,
      insufficientDataReason: `Mavjud tasdiqlangan buyurtmalar oralig'i faqat ${daysSpan} kunni tashkil qiladi. Ishonchli dinamika tahlili uchun kamida ${MIN_HISTORICAL_DAYS} kunlik savdo tarixi zarur.`,
    };
  }

  // Calculate actual revenue metrics
  let totalPaid = 0;
  let totalVolume = 0;

  validOrders.forEach((o) => {
    totalPaid += getOrderActualPaid(o);
    totalVolume += Math.max(0, Number(o.totalAmount) || 0);
  });

  const dailyRunRatePaid = totalPaid / daysSpan;
  const dailyRunRateVolume = totalVolume / daysSpan;

  const projected30DayPaid = Math.round(dailyRunRatePaid * 30);
  const projected30DayVolume = Math.round(dailyRunRateVolume * 30);

  // Split date span into two halves to check momentum without inventing growth on zero
  const midPointMs = earliestMs + (latestMs - earliestMs) / 2;
  let priorPeriodRevenue = 0;
  let recentPeriodRevenue = 0;

  validOrders.forEach((o) => {
    const t = new Date(o.createdAt).getTime();
    const paid = getOrderActualPaid(o);
    if (t < midPointMs) {
      priorPeriodRevenue += paid;
    } else {
      recentPeriodRevenue += paid;
    }
  });

  let growthRatePercent: number | null = null;
  if (priorPeriodRevenue > 0) {
    growthRatePercent = Math.round(((recentPeriodRevenue - priorPeriodRevenue) / priorPeriodRevenue) * 100);
  } else {
    // Zero prior period revenue: strictly avoid +Infinity% or artificial growth figures
    growthRatePercent = null;
  }

  return {
    isAuthorized: true,
    hasSufficientData: true,
    sampleSizeOrders: validOrders.length,
    historicalDaysSpan: daysSpan,
    totalHistoricalPaidRevenue: totalPaid,
    totalHistoricalSalesVolume: totalVolume,
    dailyRunRatePaidRevenue: Math.round(dailyRunRatePaid),
    dailyRunRateSalesVolume: Math.round(dailyRunRateVolume),
    projected30DayPaidRevenue: projected30DayPaid,
    projected30DaySalesVolume: projected30DayVolume,
    growthRatePercent,
    methodology: `So'nggi ${daysSpan} kunlik haqiqiy tasdiqlangan savdo oqimi (${validOrders.length} ta buyurtma) asosida o'rtacha kunlik run-rate ko'rsatkichi hisoblandi va 30 kunga ekstrapolyatsiya qilindi.`,
  };
}

/**
 * B) Warehouse Needs & Stock Depletion Forecast
 * Computes sales velocity per product using valid confirmed/delivered orders.
 * Excludes draft and cancelled orders.
 * When sales velocity is 0 or history is insufficient, recommended reorder quantity is 0.
 */
export function calculateWarehouseNeedsForecast(
  products: Product[],
  orders: Order[],
  planId?: string | null
): WarehouseForecastResult {
  if (!canAccessBusinessForecast(planId)) {
    return {
      isAuthorized: false,
      hasSufficientData: false,
      totalProductsChecked: 0,
      itemsNeedingReorderCount: 0,
      criticalStockCount: 0,
      warningStockCount: 0,
      items: [],
      methodology: "Ultra tarifi talab etiladi",
      insufficientDataReason: "Ushbu tahlil faqat Ultra tarifida mavjud",
    };
  }

  if (products.length === 0) {
    return {
      isAuthorized: true,
      hasSufficientData: false,
      totalProductsChecked: 0,
      itemsNeedingReorderCount: 0,
      criticalStockCount: 0,
      warningStockCount: 0,
      items: [],
      methodology: "Ombor mahsulotlari kiritilishi lozim",
      insufficientDataReason: "Omborda ro'yxatdan o'tgan hech qanday mahsulot mavjud emas",
    };
  }

  // Filter valid orders (strictly confirmed or delivered)
  const validOrders = orders.filter(
    (o) => (o.status === 'confirmed' || o.status === 'delivered') && o.createdAt
  );

  // Compute order date span for sales velocity
  let orderDaysSpan = 0;
  if (validOrders.length >= MIN_HISTORICAL_ORDERS) {
    const timestamps = validOrders
      .map((o) => new Date(o.createdAt).getTime())
      .filter((t) => !isNaN(t))
      .sort((a, b) => a - b);

    if (timestamps.length >= MIN_HISTORICAL_ORDERS) {
      const earliestMs = timestamps[0];
      const latestMs = timestamps[timestamps.length - 1];
      orderDaysSpan = Math.max(1, Math.ceil((latestMs - earliestMs) / (1000 * 60 * 60 * 24)));
    }
  }

  const hasSufficientHistory = validOrders.length >= MIN_HISTORICAL_ORDERS && orderDaysSpan >= MIN_HISTORICAL_DAYS;

  // Aggregate units sold per product across valid orders
  const unitsSoldMap = new Map<string, number>();
  validOrders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const pId = item.productId;
      const qty = Math.max(0, Number(item.quantity) || 0);
      unitsSoldMap.set(pId, (unitsSoldMap.get(pId) || 0) + qty);
    });
  });

  let criticalCount = 0;
  let warningCount = 0;

  const items: ProductStockForecastItem[] = products.map((prod) => {
    const currentStock = Math.max(0, Number(prod.quantity) || 0);
    const minAlert = Math.max(0, Number(prod.minStockAlert) || 0);
    const totalSold = unitsSoldMap.get(prod.id) || 0;

    let dailyVelocity = 0;
    let daysUntilStockout: number | null = null;
    let recommendedQty = 0;
    let rationale = "";

    if (currentStock === 0) {
      dailyVelocity = hasSufficientHistory && orderDaysSpan > 0 ? (totalSold / orderDaysSpan) : 0;
      daysUntilStockout = 0;
      recommendedQty = minAlert > 0 ? minAlert : 0;
      rationale = `Mahsulot qoldig'i 0 ga teng (zaxira tugagan). Kamida minimal zaxira miqdoricha (${minAlert} ${prod.unit}) to'ldirish tavsiya etiladi.`;
    } else if (hasSufficientHistory && orderDaysSpan > 0) {
      dailyVelocity = totalSold / orderDaysSpan;
      if (dailyVelocity > 0) {
        daysUntilStockout = Math.floor(currentStock / dailyVelocity);
        const thirtyDayDemand = Math.round(dailyVelocity * 30);
        const targetBuffer = minAlert + thirtyDayDemand;
        recommendedQty = Math.max(0, targetBuffer - currentStock);
        rationale = `O'rtacha kunlik sotuv tezligi: ${dailyVelocity.toFixed(2)} ${prod.unit}/kun (${orderDaysSpan} kunlik tarix asosida). 30 kunlik kutilayotgan talab: ${thirtyDayDemand} ${prod.unit}.`;
      } else {
        dailyVelocity = 0;
        daysUntilStockout = null;
        recommendedQty = 0; // Zero sales velocity -> do NOT force 2x minStockAlert purchase recommendation!
        rationale = `So'nggi ${orderDaysSpan} kun davomida sotuv harakati qayd etilmadi. Mahsulot qoldig'i saqlanmoqda, yangi xarid qilish shoshilinch emas.`;
      }
    } else {
      dailyVelocity = 0;
      daysUntilStockout = null;
      recommendedQty = 0; // Insufficient history -> do NOT force 2x minStockAlert purchase recommendation!
      rationale = `Sotuv tezligini aniqlash uchun tasdiqlangan buyurtmalar tarixi yetarli emas. Mahsulot sotuv dinamikasi shakllanmagani sababli avtomatik xarid tavsiyesi 0 deb belgilandi.`;
    }

    // Determine urgency status
    let urgency: 'critical' | 'warning' | 'adequate' = 'adequate';
    if (currentStock === 0) {
      urgency = 'critical';
      criticalCount++;
    } else if (daysUntilStockout !== null && daysUntilStockout <= 7) {
      urgency = 'critical';
      criticalCount++;
    } else if (currentStock <= minAlert || (daysUntilStockout !== null && daysUntilStockout <= 14)) {
      urgency = 'warning';
      warningCount++;
    }

    return {
      productId: prod.id,
      productName: prod.name,
      currentStock,
      minStockAlert: minAlert,
      unit: prod.unit,
      totalUnitsSold: totalSold,
      dailySalesVelocity: Number(dailyVelocity.toFixed(3)),
      hasSufficientVelocityHistory: hasSufficientHistory,
      estimatedDaysUntilStockout: daysUntilStockout,
      recommendedReorderQuantity: recommendedQty,
      urgencyStatus: urgency,
      rationale,
    };
  });

  // Sort: critical first, then warning, then adequate
  items.sort((a, b) => {
    const score = (item: ProductStockForecastItem) => (item.urgencyStatus === 'critical' ? 2 : item.urgencyStatus === 'warning' ? 1 : 0);
    return score(b) - score(a);
  });

  return {
    isAuthorized: true,
    hasSufficientData: true,
    totalProductsChecked: products.length,
    itemsNeedingReorderCount: criticalCount + warningCount,
    criticalStockCount: criticalCount,
    warningStockCount: warningCount,
    items,
    methodology: hasSufficientHistory
      ? `Ombor qoldig'i, belgilangan minimal zaxira va so'nggi ${orderDaysSpan} kunlik sotuv tezligi asosida tugash muddati hamda 30 kunlik to'ldirish miqdori hisoblandi.`
      : "Sotuv tezligi tarixi cheklanganligi sababli tugash kunlari uydirma qilinmadi; mahsulotlar belgilangan minimal zaxira qoldig'i bo'yicha baholandi.",
  };
}

/**
 * C) 30-Day Cautious Cash Flow Forecast
 * Reconciles actual cash run-rate against historical operational expenses.
 * Strictly avoids counting unpaid credit/debt as collected cash.
 * Prevents 30x artificial expense explosions on short interval expense logs.
 */
export function calculateCashFlowForecast(
  orders: Order[],
  transactions: FinancialTransaction[],
  planId?: string | null
): CashFlowForecastResult {
  if (!canAccessBusinessForecast(planId)) {
    return {
      isAuthorized: false,
      hasSufficientData: false,
      historicalDaysSpan: 0,
      projected30DayCashInflow: 0,
      unpaidDebtOutstanding: 0,
      totalHistoricalExpenses: 0,
      dailyExpenseBurnRate: 0,
      projected30DayExpenses: 0,
      hasExpenseHistory: false,
      projectedNetCashFlow: 0,
      cashDeficitWarning: false,
      expenseAssumptionsNote: "Ultra tarifi talab etiladi",
      methodology: "Ultra tarifi talab etiladi",
      insufficientDataReason: "Ushbu tahlil faqat Ultra tarifida mavjud",
    };
  }

  // 1. Inflow: Derive 30-day cash inflow from actual paid revenue run-rate
  const revenueForecast = calculateRevenueForecast(orders, planId);
  const projectedCashInflow = revenueForecast.hasSufficientData
    ? revenueForecast.projected30DayPaidRevenue
    : 0;

  // Unpaid credit/debt calculation across non-cancelled, non-draft orders (KEPT SEPARATE, NEVER ADDED TO INFLOW)
  let unpaidDebt = 0;
  orders.forEach((o) => {
    if (o.status === 'cancelled' || o.status === 'draft') return;
    const totalAmt = Number(o.totalAmount) || 0;
    const paid = getOrderActualPaid(o);
    unpaidDebt += Math.max(0, totalAmt - paid);
  });

  // 2. Outflow: Analyze historical operational expenses
  const expenseTransactions = transactions.filter((t) => t.type === 'expense' && Number(t.amount) > 0);
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  let expenseDaysSpan = 0;
  if (expenseTransactions.length > 0) {
    const dates = expenseTransactions
      .map((t) => (t.date ? new Date(t.date).getTime() : new Date(t.createdAt).getTime()))
      .filter((d) => !isNaN(d))
      .sort((a, b) => a - b);

    if (dates.length > 0) {
      const earliest = dates[0];
      const latest = dates[dates.length - 1];
      expenseDaysSpan = Math.max(1, Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24)));
    }
  }

  const hasExpenseHistory = expenseTransactions.length > 0;
  let dailyExpenseBurn = 0;
  let projectedExpenses = 0;
  let expenseNote = "";

  if (hasExpenseHistory) {
    // Prevent short 1-2 day expense intervals (e.g., monthly rent + 1 electricity bill on consecutive days)
    // from multiplying monthly expenses by 30x.
    // Monthly recurring operational expenses span at least a 30-day baseline cycle.
    const effectiveSpan = Math.max(expenseDaysSpan, revenueForecast.historicalDaysSpan, 30);
    dailyExpenseBurn = totalExpenses / effectiveSpan;
    projectedExpenses = Math.round(dailyExpenseBurn * 30);
    expenseNote = `Kassa chiqimi so'nggi operatsion xarajatlar yozuvi (${Math.round(totalExpenses).toLocaleString()} so'm) va ${effectiveSpan} kunlik bazaviy operatsion davr masofasi bo'yicha o'rtacha kunlik xarajat (${Math.round(dailyExpenseBurn).toLocaleString()} so'm/kun) sifatli ekstrapolyatsiya qilindi.`;
  } else {
    dailyExpenseBurn = 0;
    projectedExpenses = 0;
    expenseNote = "Hali birorta ham operatsion xarajat kiritilmagan. Prognozda kassa chiqimi 0 so'm deb faraz qilindi. Bu xarajat bo'lmaydi degani emas; xarajatlar daftari to'ldirilsa, tahlil aniqlashadi.";
  }

  // 3. Net Cash Flow = Conservative Cash Inflow - Projected Outflow
  const netCashFlow = projectedCashInflow - projectedExpenses;
  const cashDeficitWarning = revenueForecast.hasSufficientData && netCashFlow < 0;

  const hasSufficientData = revenueForecast.hasSufficientData;

  return {
    isAuthorized: true,
    hasSufficientData,
    historicalDaysSpan: revenueForecast.historicalDaysSpan || expenseDaysSpan,
    projected30DayCashInflow: projectedCashInflow,
    unpaidDebtOutstanding: unpaidDebt,
    totalHistoricalExpenses: totalExpenses,
    dailyExpenseBurnRate: Math.round(dailyExpenseBurn),
    projected30DayExpenses: projectedExpenses,
    hasExpenseHistory,
    projectedNetCashFlow: netCashFlow,
    cashDeficitWarning,
    expenseAssumptionsNote: expenseNote,
    methodology: "Ehtiyotkor kassa modeli: mijozlarning to'lanmagan qarzdorligi (nasiya) kafolatlangan naqd pul deb hisoblanmadi. Faqat amalda tushgan tushum sur'ati va operatsion xarajatlar chiqimi taqqoslandi.",
    insufficientDataReason: !hasSufficientData ? revenueForecast.insufficientDataReason : undefined,
  };
}

/**
 * Unified forecast generator combining Revenue, Warehouse, and Cash Flow models.
 */
export function generateBusinessForecast(
  orders: Order[],
  transactions: FinancialTransaction[],
  products: Product[],
  planId?: string | null
): UnifiedBusinessForecast {
  const isAuthorized = canAccessBusinessForecast(planId);
  return {
    isAuthorized,
    revenue: calculateRevenueForecast(orders, planId),
    warehouse: calculateWarehouseNeedsForecast(products, orders, planId),
    cashFlow: calculateCashFlowForecast(orders, transactions, planId),
  };
}
