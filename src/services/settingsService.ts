/**
 * BiznesYordam - System & Business Settings Service
 * Manages user preferences (/users/{userId}/settings/appConfig)
 * and data privacy/export operations.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeFirestorePayload } from './firebase';
import { AppSettings } from '../types/modules';
import { DEFAULT_TELEGRAM_CONFIG } from './telegramService';
import { DEFAULT_LOYALTY_CONFIG } from './loyaltyService';
import { DEFAULT_PRINTER_CONFIG } from './barcodePrinterService';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 'appConfig',
  userId: '',
  theme: 'emerald',
  reducedMotion: false,
  currency: 'UZS',
  timezone: 'Asia/Tashkent',
  taxPercent: 0,
  receiptText: 'Xaridingiz uchun rahmat!',
  printerConfig: DEFAULT_PRINTER_CONFIG,
  telegramConfig: DEFAULT_TELEGRAM_CONFIG,
  loyaltyConfig: DEFAULT_LOYALTY_CONFIG,
  updatedAt: new Date().toISOString(),
};

/**
 * Gets app settings for user from Firestore or localStorage fallback
 */
export async function getAppSettings(userId: string): Promise<AppSettings> {
  if (!userId) return { ...DEFAULT_APP_SETTINGS, userId };
  const docRef = doc(db, 'users', userId, 'settings', 'appConfig');

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_APP_SETTINGS, userId, ...snap.data() } as AppSettings;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}/settings/appConfig`);
  }

  // Fallback to local storage or defaults
  try {
    const cached = localStorage.getItem(`besto_settings_${userId}`);
    if (cached) return JSON.parse(cached);
  } catch {
    // Ignore
  }

  return { ...DEFAULT_APP_SETTINGS, userId };
}

/**
 * Saves app settings to Firestore
 */
export async function saveAppSettings(
  userId: string,
  settings: Partial<AppSettings>
): Promise<AppSettings> {
  if (!userId) throw new Error("Foydalanuvchi tizimga kirmagan");
  const docRef = doc(db, 'users', userId, 'settings', 'appConfig');
  const existing = await getAppSettings(userId);

  const updated: AppSettings = {
    ...existing,
    ...settings,
    userId,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(docRef, sanitizeFirestorePayload(updated));
    try {
      localStorage.setItem(`besto_settings_${userId}`, JSON.stringify(updated));
    } catch {
      // Storage safety
    }
    return updated;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/settings/appConfig`);
    throw err;
  }
}

/**
 * Exports all user data across modules into a single downloadable JSON object
 */
export async function exportUserDataBundle(userId: string): Promise<{
  exportDate: string;
  userId: string;
  appVersion: string;
  summary: string;
  data: any;
}> {
  if (!userId) throw new Error("Foydalanuvchi tizimga kirmagan");

  // Dynamically import getters to collect full account snapshot
  const { getProducts } = await import('./inventoryService');
  const { getOrders } = await import('./orderService');
  const { getCustomers } = await import('./crmService');
  const { getTransactions } = await import('./financeService');
  const { getSuppliers, getPurchaseOrders } = await import('./supplierService');
  const { getStaffMembers, getShifts } = await import('./staffService');
  const { getBranches, getWarehouses, getStockTransfers } = await import('./multiBranchService');

  const [products, orders, customers, transactions, suppliers, purchaseOrders, staff, shifts, branches, warehouses, transfers] =
    await Promise.all([
      getProducts(userId),
      getOrders(userId),
      getCustomers(userId),
      getTransactions(userId),
      getSuppliers(userId),
      getPurchaseOrders(userId),
      getStaffMembers(userId),
      getShifts(userId),
      getBranches(userId),
      getWarehouses(userId),
      getStockTransfers(userId),
    ]);

  return {
    exportDate: new Date().toISOString(),
    userId,
    appVersion: '2.4.0',
    summary: `BESTO SaaS Ma'lumotlar to'plami: ${products.length} ta tovar, ${orders.length} ta buyurtma, ${customers.length} ta mijoz.`,
    data: {
      products,
      orders,
      customers,
      transactions,
      suppliers,
      purchaseOrders,
      staff,
      shifts,
      branches,
      warehouses,
      transfers,
    },
  };
}
