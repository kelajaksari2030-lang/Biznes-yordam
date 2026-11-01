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
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logFirestoreOp, sanitizeFirestorePayload } from './firebase';
import { Product, ProductInput, ProductUnit, RecipeItem } from '../types/inventory';
import { ParsedProductRow } from '../utils/csvProductParser';

export interface InventoryStats {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalQuantity: number;
  totalPurchaseValue: number;
  totalSellingValue: number;
  potentialProfit: number;
}

/**
 * Checks whether a product quantity is 0 or less (Tugagan / Out of Stock)
 */
export function isOutOfStock(product: Pick<Product, 'quantity'>): boolean {
  return Number(product.quantity) <= 0;
}

/**
 * Checks whether a product quantity is strictly positive but less than or equal to minimal stock threshold (Kam qolgan / Low Stock)
 */
export function isLowStock(product: Pick<Product, 'quantity' | 'minStockAlert'>): boolean {
  const qty = Number(product.quantity);
  return qty > 0 && qty <= Number(product.minStockAlert);
}

/**
 * Validates product recipe / BOM (Bill of Materials)
 */
export function validateRecipe(
  recipe: RecipeItem[] | undefined,
  currentProductId?: string,
  allProducts: Product[] = []
): { isValid: boolean; errors: string[] } {
  if (!recipe || recipe.length === 0) {
    return { isValid: true, errors: [] };
  }

  const errors: string[] = [];
  const seenIngredients = new Set<string>();

  for (const item of recipe) {
    if (!item.ingredientProductId || !item.ingredientProductId.trim()) {
      errors.push("Xomashyo/ingredient tanlanishi shart");
      continue;
    }

    const ingId = item.ingredientProductId.trim();

    // 1. Self-reference check
    if (currentProductId && ingId === currentProductId) {
      errors.push("Mahsulot o'z-o'ziga ingredient bo'la olmaydi");
    }

    // 2. Duplicate check within recipe
    if (seenIngredients.has(ingId)) {
      errors.push("Bitta ingredient retseptda faqat bir marta kiritilishi mumkin");
    }
    seenIngredients.add(ingId);

    // 3. Positive quantity check
    const qty = Number(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      errors.push("Ingredient miqdori 0 dan katta musbat son bo'lishi shart");
    }

    // 4. Existence and circular reference check
    if (allProducts.length > 0) {
      const targetProd = allProducts.find((p) => p.id === ingId);
      if (!targetProd) {
        errors.push(`Tanlangan ingredient omborda topilmadi (ID: ${ingId})`);
      } else if (targetProd.recipe && currentProductId) {
        // Direct cycle check: if targetProd itself has currentProductId in its recipe
        const hasReverseRef = targetProd.recipe.some(
          (r) => r.ingredientProductId === currentProductId
        );
        if (hasReverseRef) {
          errors.push(
            `Siklik bog'liqlik aniqlandi: "${targetProd.name}" allaqachon ushbu mahsulotni ingredient sifatida ishlatadi`
          );
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Computes raw recipe production cost by summing ingredient purchase prices * quantities
 */
export function calculateRecipeCost(
  recipe: RecipeItem[] | undefined,
  productsMap: Map<string, Product> | Product[]
): number {
  if (!recipe || recipe.length === 0) return 0;

  const map = Array.isArray(productsMap)
    ? new Map(productsMap.map((p) => [p.id, p]))
    : productsMap;

  let totalCost = 0;
  for (const item of recipe) {
    const prod = map.get(item.ingredientProductId);
    if (prod) {
      totalCost += (Number(prod.purchasePrice) || 0) * (Number(item.quantity) || 0);
    }
  }
  return totalCost;
}

/**
 * Checks whether a product can be safely deleted (e.g. not referenced in recipes)
 */
export function canDeleteProduct(
  productId: string,
  allProducts: Product[] = []
): { canDelete: boolean; reason?: string } {
  if (!productId) return { canDelete: true };

  const targetProd = allProducts.find(
    (p) =>
      p.id === productId ||
      p.sku === productId ||
      (p.sku && p.sku.toLowerCase().trim() === productId.toLowerCase().trim())
  );

  const targetId = targetProd ? targetProd.id : productId;
  const targetSku = targetProd?.sku ? targetProd.sku.trim().toLowerCase() : productId.trim().toLowerCase();

  const dependentProduct = allProducts.find(
    (p) =>
      p.id !== targetId &&
      p.recipe &&
      p.recipe.some((r) => {
        const ingId = (r.ingredientProductId || '').trim().toLowerCase();
        if (!ingId) return false;
        return ingId === targetId.toLowerCase() || (Boolean(targetSku) && ingId === targetSku);
      })
  );

  if (dependentProduct) {
    return {
      canDelete: false,
      reason: `Ushbu mahsulot "${dependentProduct.name}" retseptida xomashyo/ingredient sifatida ishlatilmoqda. Avval ushbu retseptdan olib tashlang.`,
    };
  }

  return { canDelete: true };
}

/**
 * Validates product form inputs
 */
export function validateProductInput(
  input: Partial<ProductInput>,
  currentProductId?: string,
  allProducts: Product[] = []
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.name || !input.name.trim()) {
    errors.push("Mahsulot nomi kiritilishi shart");
  } else if (input.name.trim().length > 250) {
    errors.push("Mahsulot nomi 250 belgidan oshmasligi kerak");
  }

  if (input.sku && input.sku.trim()) {
    const cleanSku = input.sku.trim().toLowerCase();
    const duplicateSkuProduct = allProducts.find(
      (p) => p.id !== currentProductId && p.sku.trim().toLowerCase() === cleanSku
    );
    if (duplicateSkuProduct) {
      errors.push(
        `Ushbu SKU kodi ("${input.sku.trim()}") allaqachon "${duplicateSkuProduct.name}" mahsulotiga biriktirilgan`
      );
    }
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

  if (input.recipe && input.recipe.length > 0) {
    const recipeVal = validateRecipe(input.recipe, currentProductId, allProducts);
    if (!recipeVal.isValid) {
      errors.push(...recipeVal.errors);
    }
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
        recipe: Array.isArray(data.recipe) ? data.recipe : undefined,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
    try {
      const cached = localStorage.getItem('biznes_inventory_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  }
}

/**
 * Creates or updates a product in Firestore
 */
export async function saveProduct(
  userId: string,
  input: ProductInput,
  productId?: string,
  allProducts: Product[] = []
): Promise<Product> {
  if (!userId || !userId.trim()) {
    throw new Error("Foydalanuvchi identifikatori (userId) mavjud emas.");
  }

  const validation = validateProductInput(input, productId, allProducts);
  if (!validation.isValid) {
    throw new Error(validation.errors.join('. '));
  }

  const id = productId || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docPath = `users/${userId}/products/${id}`;
  const nowIso = new Date().toISOString();

  // Preserve original createdAt when editing
  const existingProduct = productId ? allProducts.find((p) => p.id === productId) : undefined;
  const createdAt = existingProduct?.createdAt || nowIso;

  // Generate clean SKU if omitted
  const sku = (input.sku || '').trim() || `SKU-${Date.now().toString().slice(-6)}`;

  const hasRecipe = Array.isArray(input.recipe) && input.recipe.length > 0;
  const recipeItems = hasRecipe ? input.recipe : [];

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
    recipe: hasRecipe ? recipeItems : undefined,
    createdAt,
    updatedAt: nowIso,
  };

  // Build sanitized payload for Firestore write without undefined keys
  const docPayload: Record<string, any> = {
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
    recipe: recipeItems,
    createdAt,
    updatedAt: nowIso,
  };

  const cleanPayload = sanitizeFirestorePayload(docPayload);

  logFirestoreOp(OperationType.WRITE, docPath);

  try {
    const docRef = doc(db, 'users', userId, 'products', id);
    await setDoc(docRef, cleanPayload, { merge: true });
    return productRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
    throw error;
  }
}

/**
 * Bulk imports validated products into /users/{userId}/products using Firestore batched writes
 */
export async function batchImportProducts(
  userId: string,
  rows: ParsedProductRow[],
  importMode: 'update' | 'skip',
  existingProducts: Product[]
): Promise<{ added: number; updated: number; failed: number }> {
  if (!userId || !userId.trim()) {
    throw new Error("Foydalanuvchi identifikatori (userId) mavjud emas.");
  }

  const existingBySku = new Map<string, Product>();
  for (const p of existingProducts) {
    if (p.sku) existingBySku.set(p.sku.trim().toLowerCase(), p);
  }

  const validRows = rows.filter((r) => r.isValid);
  if (validRows.length === 0) {
    return { added: 0, updated: 0, failed: rows.length };
  }

  let added = 0;
  let updated = 0;
  let failed = rows.length - validRows.length;

  const nowIso = new Date().toISOString();
  const chunkSize = 400; // safely below Firestore 500 operation limit per batch

  for (let i = 0; i < validRows.length; i += chunkSize) {
    const chunk = validRows.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    for (let cIdx = 0; cIdx < chunk.length; cIdx++) {
      const row = chunk[cIdx];
      const lowerSku = row.sku.toLowerCase();
      const existing = existingBySku.get(lowerSku);

      if (existing) {
        if (importMode === 'update') {
          const docRef = doc(db, 'users', userId, 'products', existing.id);
          batch.update(docRef, {
            name: row.name,
            purchasePrice: row.costPrice,
            sellingPrice: row.salePrice,
            quantity: row.initialStock,
            unit: row.unit,
            minStockAlert: row.minimumStock,
            updatedAt: nowIso,
          });
          updated++;
        } else {
          // Mode === 'skip' - do not touch existing
        }
      } else {
        const id = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${i + cIdx}`;
        const docRef = doc(db, 'users', userId, 'products', id);
        const newProduct: Product = {
          id,
          userId,
          name: row.name,
          sku: row.sku,
          purchasePrice: row.costPrice,
          sellingPrice: row.salePrice,
          quantity: row.initialStock,
          unit: row.unit,
          minStockAlert: row.minimumStock,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        batch.set(docRef, newProduct);
        existingBySku.set(lowerSku, newProduct);
        added++;
      }
    }

    try {
      await batch.commit();
      logFirestoreOp(OperationType.WRITE, `users/${userId}/products (bulk batch ${chunk.length} items)`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}/products (bulk batch error)`);
      failed += chunk.length;
    }
  }

  return { added, updated, failed };
}

/**
 * Deletes a product from Firestore
 */
export async function deleteProduct(
  userId: string,
  productId: string,
  allProducts: Product[] = []
): Promise<void> {
  if (!userId || !productId) return;

  const targetProd = allProducts.find(
    (p) =>
      p.id === productId ||
      p.sku === productId ||
      (p.sku && p.sku.toLowerCase().trim() === productId.toLowerCase().trim())
  );
  const realDocId = targetProd ? targetProd.id : productId;

  // Safety check: verify if product is used as ingredient in any recipe
  const check = canDeleteProduct(realDocId, allProducts);
  if (!check.canDelete) {
    throw new Error(check.reason);
  }

  const docPath = `users/${userId}/products/${realDocId}`;
  logFirestoreOp(OperationType.DELETE, docPath);

  try {
    const docRef = doc(db, 'users', userId, 'products', realDocId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
    throw error;
  }
}

/**
 * Filters products client-side by search query, low-stock flag, and out-of-stock flag
 */
export function filterProducts(
  products: Product[],
  searchQuery: string,
  filterLowStockOnly?: boolean,
  filterOutOfStockOnly?: boolean
): Product[] {
  const queryClean = searchQuery.toLowerCase().trim();

  return products.filter((p) => {
    if (filterOutOfStockOnly) {
      if (!isOutOfStock(p)) return false;
    } else if (filterLowStockOnly) {
      if (!isLowStock(p)) return false;
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
  let outOfStockCount = 0;
  let totalQuantity = 0;
  let totalPurchaseValue = 0;
  let totalSellingValue = 0;

  for (const p of products) {
    if (isOutOfStock(p)) {
      outOfStockCount++;
    } else if (isLowStock(p)) {
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
    outOfStockCount,
    totalQuantity,
    totalPurchaseValue,
    totalSellingValue,
    potentialProfit: totalSellingValue - totalPurchaseValue,
  };
}
