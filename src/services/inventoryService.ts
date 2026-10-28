/**
 * BiznesYordam - Warehouse & Inventory Service
 * Manages products at /users/{userId}/products/{productId}
 * Strictly isolated per authenticated user (ABAC/Owner-enforced).
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logFirestoreOp } from './firebase';
import { Product, ProductInput, ProductUnit } from '../types/inventory';

export interface InventoryStats {
  totalProducts: number;
  lowStockCount: number;
  totalQuantity: number;
  totalPurchaseValue: number;
  totalSellingValue: number;
  potentialProfit: number;
}

/**
 * Checks whether a product has hit or gone below the minimal stock threshold
 */
export function isLowStock(product: Pick<Product, 'quantity' | 'minStockAlert'>): boolean {
  return Number(product.quantity) <= Number(product.minStockAlert);
}

/**
 * Validates product form inputs
 */
export function validateProductInput(input: Partial<ProductInput>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.name || !input.name.trim()) {
    errors.push("Mahsulot nomi kiritilishi shart");
  } else if (input.name.trim().length > 250) {
    errors.push("Mahsulot nomi 250 belgidan oshmasligi kerak");
  }

  if (input.purchasePrice === undefined || isNaN(Number(input.purchasePrice)) || Number(input.purchasePrice) < 0) {
    errors.push("Xarid narxi 0 yoki undan katta son bo'lishi shart");
  }

  if (input.sellingPrice === undefined || isNaN(Number(input.sellingPrice)) || Number(input.sellingPrice) < 0) {
    errors.push("Sotuv narxi 0 yoki undan katta son bo'lishi shart");
  }

  if (input.quantity === undefined || isNaN(Number(input.quantity)) || Number(input.quantity) < 0) {
    errors.push("Ombordagi miqdor 0 yoki undan katta son bo'lishi shart");
  }

  if (input.minStockAlert === undefined || isNaN(Number(input.minStockAlert)) || Number(input.minStockAlert) < 0) {
    errors.push("Minimal ogohlantirish qoldig'i 0 yoki undan katta bo'lishi kerak");
  }

  if (!input.unit || !input.unit.trim()) {
    errors.push("O'lchov birligi tanlanishi shart");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Fetches all products for a given user from Firestore
 */
export async function getProducts(userId: string): Promise<Product[]> {
  if (!userId || !userId.trim()) return [];

  const collectionPath = `users/${userId}/products`;
  logFirestoreOp(OperationType.LIST, collectionPath);

  try {
    const colRef = collection(db, 'users', userId, 'products');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId,
        name: data.name || '',
        sku: data.sku || '',
        purchasePrice: Number(data.purchasePrice) || 0,
        sellingPrice: Number(data.sellingPrice) || 0,
        quantity: Number(data.quantity) || 0,
        unit: (data.unit as ProductUnit) || 'dona',
        minStockAlert: Number(data.minStockAlert) || 5,
        category: data.category || '',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
    return [];
  }
}

/**
 * Creates or updates a product in Firestore
 */
export async function saveProduct(
  userId: string,
  input: ProductInput,
  productId?: string
): Promise<Product> {
  if (!userId || !userId.trim()) {
    throw new Error("Foydalanuvchi identifikatori (userId) mavjud emas.");
  }

  const validation = validateProductInput(input);
  if (!validation.isValid) {
    throw new Error(validation.errors.join('. '));
  }

  const id = productId || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docPath = `users/${userId}/products/${id}`;
  const nowIso = new Date().toISOString();

  // Generate clean SKU if omitted
  const sku = (input.sku || '').trim() || `SKU-${Date.now().toString().slice(-6)}`;

  const productRecord: Product = {
    id,
    userId,
    name: input.name.trim(),
    sku,
    purchasePrice: Number(input.purchasePrice) || 0,
    sellingPrice: Number(input.sellingPrice) || 0,
    quantity: Number(input.quantity) || 0,
    unit: input.unit || 'dona',
    minStockAlert: Number(input.minStockAlert) || 5,
    category: (input.category || '').trim(),
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  logFirestoreOp(OperationType.WRITE, docPath);

  try {
    const docRef = doc(db, 'users', userId, 'products', id);
    await setDoc(docRef, productRecord, { merge: true });
    return productRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
    throw error;
  }
}

/**
 * Deletes a product from Firestore
 */
export async function deleteProduct(userId: string, productId: string): Promise<void> {
  if (!userId || !productId) return;

  const docPath = `users/${userId}/products/${productId}`;
  logFirestoreOp(OperationType.DELETE, docPath);

  try {
    const docRef = doc(db, 'users', userId, 'products', productId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
    throw error;
  }
}

/**
 * Filters products client-side by search query and low-stock flag
 */
export function filterProducts(
  products: Product[],
  searchQuery: string,
  filterLowStockOnly?: boolean
): Product[] {
  const queryClean = searchQuery.toLowerCase().trim();

  return products.filter((p) => {
    if (filterLowStockOnly && !isLowStock(p)) {
      return false;
    }

    if (!queryClean) return true;

    const nameMatch = p.name.toLowerCase().includes(queryClean);
    const skuMatch = p.sku.toLowerCase().includes(queryClean);
    const catMatch = (p.category || '').toLowerCase().includes(queryClean);

    return nameMatch || skuMatch || catMatch;
  });
}

/**
 * Computes high-level aggregated inventory metrics
 */
export function calculateInventoryStats(products: Product[]): InventoryStats {
  let lowStockCount = 0;
  let totalQuantity = 0;
  let totalPurchaseValue = 0;
  let totalSellingValue = 0;

  for (const p of products) {
    if (isLowStock(p)) {
      lowStockCount++;
    }
    const qty = Number(p.quantity) || 0;
    totalQuantity += qty;
    totalPurchaseValue += qty * (Number(p.purchasePrice) || 0);
    totalSellingValue += qty * (Number(p.sellingPrice) || 0);
  }

  return {
    totalProducts: products.length,
    lowStockCount,
    totalQuantity,
    totalPurchaseValue,
    totalSellingValue,
    potentialProfit: totalSellingValue - totalPurchaseValue,
  };
}
