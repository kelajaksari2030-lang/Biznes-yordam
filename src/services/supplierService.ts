/**
 * BiznesYordam - Suppliers & Purchasing Service
 * Manages suppliers (/users/{userId}/suppliers) and purchase orders (/users/{userId}/purchaseOrders).
 * Implements idempotent stock receipt, cost averaging, and supplier balance management.
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
  runTransaction,
  getDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeFirestorePayload } from './firebase';
import { Supplier, PurchaseOrder, PurchaseOrderItem } from '../types/modules';
import { Product } from '../types/inventory';

/**
 * Fetches all suppliers for a user
 */
export async function getSuppliers(userId: string): Promise<Supplier[]> {
  if (!userId) return [];
  const colRef = collection(db, 'users', userId, 'suppliers');
  const q = query(colRef, orderBy('createdAt', 'desc'));
  try {
    const snap = await getDocs(q);
    const suppliers: Supplier[] = [];
    snap.forEach((d) => suppliers.push({ id: d.id, ...d.data() } as Supplier));
    return suppliers;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${userId}/suppliers`);
    return [];
  }
}

/**
 * Creates a new supplier
 */
export async function createSupplier(
  userId: string,
  input: Omit<Supplier, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<Supplier> {
  if (!userId) throw new Error("Foydalanuvchi tizimga kirmagan");
  if (!input.name || !input.name.trim()) throw new Error("Ta'minotchi nomi ko'rsatilsin");
  if (!input.phone || !input.phone.trim()) throw new Error("Ta'minotchi telefoni ko'rsatilsin");

  const colRef = collection(db, 'users', userId, 'suppliers');
  const newDoc = doc(colRef);
  const now = new Date().toISOString();

  const supplier: Supplier = {
    id: newDoc.id,
    userId,
    name: input.name.trim(),
    contactPerson: input.contactPerson?.trim() || '',
    phone: input.phone.trim(),
    companyName: input.companyName?.trim() || '',
    address: input.address?.trim() || '',
    balancePayable: Math.max(0, Number(input.balancePayable) || 0),
    notes: input.notes?.trim() || '',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(newDoc, sanitizeFirestorePayload(supplier));
    return supplier;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${userId}/suppliers/${newDoc.id}`);
    throw err;
  }
}

/**
 * Updates a supplier
 */
export async function updateSupplier(
  userId: string,
  supplierId: string,
  input: Partial<Supplier>
): Promise<void> {
  if (!userId || !supplierId) return;
  const docRef = doc(db, 'users', userId, 'suppliers', supplierId);
  const now = new Date().toISOString();
  try {
    await updateDoc(docRef, sanitizeFirestorePayload({ ...input, updatedAt: now }));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/suppliers/${supplierId}`);
    throw err;
  }
}

/**
 * Deletes a supplier
 */
export async function deleteSupplier(userId: string, supplierId: string): Promise<void> {
  if (!userId || !supplierId) return;
  const docRef = doc(db, 'users', userId, 'suppliers', supplierId);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}/suppliers/${supplierId}`);
    throw err;
  }
}

/**
 * Fetches all purchase orders
 */
export async function getPurchaseOrders(userId: string): Promise<PurchaseOrder[]> {
  if (!userId) return [];
  const colRef = collection(db, 'users', userId, 'purchaseOrders');
  const q = query(colRef, orderBy('createdAt', 'desc'));
  try {
    const snap = await getDocs(q);
    const orders: PurchaseOrder[] = [];
    snap.forEach((d) => orders.push({ id: d.id, ...d.data() } as PurchaseOrder));
    return orders;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${userId}/purchaseOrders`);
    return [];
  }
}

/**
 * Creates a new purchase order
 */
export async function createPurchaseOrder(
  userId: string,
  input: {
    supplierId: string;
    supplierName: string;
    items: PurchaseOrderItem[];
    paidAmount?: number;
    notes?: string;
  }
): Promise<PurchaseOrder> {
  if (!userId) throw new Error("Foydalanuvchi tizimga kirmagan");
  if (!input.supplierId) throw new Error("Ta'minotchi tanlanishi shart");
  if (!input.items || input.items.length === 0) throw new Error("Kamida 1 ta tovar ko'rsatilsin");

  const colRef = collection(db, 'users', userId, 'purchaseOrders');
  const newDoc = doc(colRef);
  const now = new Date().toISOString();
  const poNumber = `PO-${Date.now().toString().slice(-6)}`;

  let totalAmount = 0;
  const processedItems: PurchaseOrderItem[] = input.items.map((it) => {
    const qty = Math.max(0, Number(it.quantity) || 0);
    const cost = Math.max(0, Number(it.unitCost) || 0);
    const itemTotal = qty * cost;
    totalAmount += itemTotal;
    return {
      productId: it.productId,
      productName: it.productName,
      quantity: qty,
      unitCost: cost,
      totalCost: itemTotal,
      unit: it.unit || 'dona',
    };
  });

  const paidAmount = Math.min(totalAmount, Math.max(0, Number(input.paidAmount) || 0));
  let paymentStatus: 'unpaid' | 'partially_paid' | 'paid' = 'unpaid';
  if (paidAmount >= totalAmount && totalAmount > 0) {
    paymentStatus = 'paid';
  } else if (paidAmount > 0) {
    paymentStatus = 'partially_paid';
  }

  const po: PurchaseOrder = {
    id: newDoc.id,
    userId,
    poNumber,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    items: processedItems,
    totalAmount,
    paidAmount,
    status: 'draft',
    paymentStatus,
    receivedAt: null,
    notes: input.notes?.trim() || '',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(newDoc, sanitizeFirestorePayload(po));
    return po;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${userId}/purchaseOrders/${newDoc.id}`);
    throw err;
  }
}

/**
 * Receives a Purchase Order ATOMICALLY & IDEMPOTENTLY:
 * 1. Reads PO doc. If status === 'received', returns immediately without duplicating stock.
 * 2. Adds quantities to matching product records in /users/{userId}/products.
 * 3. Updates product average cost (weighted moving average).
 * 4. Increments supplier balancePayable by (totalAmount - paidAmount).
 * 5. Sets PO status to 'received' and receivedAt = timestamp.
 */
export async function receivePurchaseOrder(userId: string, poId: string): Promise<PurchaseOrder> {
  if (!userId || !poId) throw new Error("Noto'g'ri parametrolar");
  const poRef = doc(db, 'users', userId, 'purchaseOrders', poId);

  try {
    const updatedPo = await runTransaction(db, async (tx) => {
      // 1. ALL READS
      const poSnap = await tx.get(poRef);
      if (!poSnap.exists()) throw new Error("Xarid buyurtmasi topilmadi");
      const poData = poSnap.data() as PurchaseOrder;

      if (poData.userId !== userId) throw new Error("Ruxsat yo'q");
      if (poData.status === 'received') return poData; // IDEMPOTENT RETURN
      if (poData.status === 'cancelled') throw new Error("Bekor qilingan buyurtmani qabul qilib bo'lmaydi");

      // Read supplier doc if available
      const supplierRef = doc(db, 'users', userId, 'suppliers', poData.supplierId);
      const supplierSnap = await tx.get(supplierRef);

      // Read all products in order
      const productMap = new Map<string, Product>();
      for (const item of poData.items) {
        if (!productMap.has(item.productId)) {
          const pRef = doc(db, 'users', userId, 'products', item.productId);
          const pSnap = await tx.get(pRef);
          if (pSnap.exists()) {
            productMap.set(item.productId, pSnap.data() as Product);
          }
        }
      }

      // 2. ALL WRITES
      const now = new Date().toISOString();

      // Update product inventory & cost
      for (const item of poData.items) {
        const prod = productMap.get(item.productId);
        if (prod) {
          const pRef = doc(db, 'users', userId, 'products', item.productId);
          const oldQty = Number(prod.quantity) || 0;
          const oldCost = Number(prod.purchasePrice) || 0;
          const newQty = oldQty + item.quantity;
          
          // Weighted average cost formula
          const newAvgCost = newQty > 0 
            ? Math.round(((oldQty * oldCost) + (item.quantity * item.unitCost)) / newQty)
            : item.unitCost;

          tx.update(pRef, {
            quantity: newQty,
            purchasePrice: newAvgCost,
            updatedAt: now,
          });
        }
      }

      // Update supplier balance payable (unpaid amount owed)
      if (supplierSnap.exists()) {
        const supData = supplierSnap.data() as Supplier;
        const unpaidDebt = Math.max(0, poData.totalAmount - poData.paidAmount);
        if (unpaidDebt > 0) {
          tx.update(supplierRef, {
            balancePayable: (Number(supData.balancePayable) || 0) + unpaidDebt,
            updatedAt: now,
          });
        }
      }

      const updatePayload = {
        status: 'received' as const,
        receivedAt: now,
        updatedAt: now,
      };

      tx.update(poRef, updatePayload);
      return { ...poData, ...updatePayload };
    });

    return updatedPo;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/purchaseOrders/${poId}`);
    throw err;
  }
}
