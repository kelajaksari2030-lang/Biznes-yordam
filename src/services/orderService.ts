/**
 * BiznesYordam - Sales Orders Service
 * Manages orders at /users/{userId}/orders/{orderId}
 * Strictly isolated per authenticated user (ABAC/Owner-enforced).
 * 
 * Includes atomic stock deduction and idempotent confirmation/cancellation
 * via Firestore transactions (reads strictly executed before writes).
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  runTransaction,
  getDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logFirestoreOp } from './firebase';
import { Order, OrderItem, OrderStatus, OrderPaymentStatus } from '../types/business';
import { Product } from '../types/inventory';
import { Customer } from '../types/crm';

export interface CreateOrderInput {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number; // Snapshot of selling price
    unitCost: number;  // Snapshot of purchase/production cost
    unit?: string;
  }[];
  status?: OrderStatus;
  paymentStatus?: OrderPaymentStatus;
  paidAmount?: number;
  notes?: string;
}

export interface OrderStats {
  totalOrders: number;
  draftCount: number;
  confirmedCount: number;
  deliveredCount: number;
  cancelledCount: number;
  totalRevenue: number;     // Jami savdo hajmi (barcha bekor qilinmagan buyurtmalar)
  paidRevenue: number;      // Haqiqiy qabul qilingan naqd/to'langan tushum (paymentStatus === 'paid')
  unpaidRevenue: number;    // Nasiya yoki kutilayotgan summa (paymentStatus !== 'paid')
  totalCost: number;
  totalProfit: number;
  realizedProfit: number;   // To'langan buyurtmalar bo'yicha tushgan real foyda
}

/**
 * Validates order input before saving
 */
export function validateOrderInput(input: Partial<CreateOrderInput>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.customerId || !input.customerId.trim()) {
    errors.push("Mijoz tanlanishi shart");
  }

  if (!input.customerName || !input.customerName.trim()) {
    errors.push("Mijoz ismi ko'rsatilishi shart");
  }

  if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
    errors.push("Buyurtmada kamida 1 ta mahsulot bo'lishi kerak");
  } else {
    input.items.forEach((item, idx) => {
      if (!item.productId || !item.productId.trim()) {
        errors.push(`${idx + 1}-tovarda mahsulot ID si mavjud emas`);
      }
      if (!item.productName || !item.productName.trim()) {
        errors.push(`${idx + 1}-tovarda mahsulot nomi ko'rsatilmagan`);
      }
      if (item.quantity === undefined || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
        errors.push(`"${item.productName || idx + 1}": Miqdor 0 dan katta son bo'lishi kerak`);
      }
      if (item.unitPrice === undefined || isNaN(Number(item.unitPrice)) || Number(item.unitPrice) < 0) {
        errors.push(`"${item.productName || idx + 1}": Sotuv narxi 0 yoki undan katta bo'lishi kerak`);
      }
      if (item.unitCost === undefined || isNaN(Number(item.unitCost)) || Number(item.unitCost) < 0) {
        errors.push(`"${item.productName || idx + 1}": Tannarx 0 yoki undan katta bo'lishi kerak`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculates item totals and order-level financial metrics
 */
export function calculateOrderFinancials(items: CreateOrderInput['items']): {
  processedItems: OrderItem[];
  totalAmount: number;
  totalCost: number;
  totalProfit: number;
} {
  let totalAmount = 0;
  let totalCost = 0;

  const processedItems: OrderItem[] = items.map((item) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const uPrice = Math.max(0, Number(item.unitPrice) || 0);
    const uCost = Math.max(0, Number(item.unitCost) || 0);

    const itemTotal = qty * uPrice;
    const itemCost = qty * uCost;

    totalAmount += itemTotal;
    totalCost += itemCost;

    return {
      productId: item.productId,
      productName: item.productName,
      quantity: qty,
      unitPrice: uPrice,
      unitCost: uCost,
      unit: item.unit || 'dona',
      totalPrice: itemTotal,
      totalCost: itemCost,
    };
  });

  return {
    processedItems,
    totalAmount,
    totalCost,
    totalProfit: totalAmount - totalCost,
  };
}

/**
 * Computes aggregate summary statistics for a user's orders
 */
export function calculateOrderStats(orders: Order[]): OrderStats {
  const stats: OrderStats = {
    totalOrders: orders.length,
    draftCount: 0,
    confirmedCount: 0,
    deliveredCount: 0,
    cancelledCount: 0,
    totalRevenue: 0,
    paidRevenue: 0,
    unpaidRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    realizedProfit: 0,
  };

  orders.forEach((order) => {
    switch (order.status) {
      case 'draft':
        stats.draftCount++;
        break;
      case 'confirmed':
        stats.confirmedCount++;
        break;
      case 'delivered':
        stats.deliveredCount++;
        break;
      case 'cancelled':
        stats.cancelledCount++;
        break;
    }

    // Exclude cancelled orders from revenue and profit aggregates
    if (order.status !== 'cancelled') {
      const orderAmount = order.totalAmount || 0;
      const orderCost = order.totalCost || 0;
      const orderProfit = orderAmount - orderCost;

      stats.totalRevenue += orderAmount;
      stats.totalCost += orderCost;
      stats.totalProfit += orderProfit;

      // Real cash inflow vs unpaid/partially paid credit
      let actualPaid = 0;
      if (order.paymentStatus === 'paid') {
        actualPaid = typeof order.paidAmount === 'number' ? order.paidAmount : orderAmount;
      } else if (order.paymentStatus === 'partially_paid') {
        // If paidAmount is specified, count that exact partial amount.
        // If paidAmount is missing/unspecified, DO NOT count the full amount (Rule #2). Count 0.
        actualPaid = typeof order.paidAmount === 'number'
          ? Math.min(orderAmount, Math.max(0, order.paidAmount))
          : 0;
      } else {
        // 'unpaid'
        actualPaid = 0;
      }

      const remainingDebt = Math.max(0, orderAmount - actualPaid);

      stats.paidRevenue += actualPaid;
      stats.unpaidRevenue += remainingDebt;

      const profitRatio = orderAmount > 0 ? actualPaid / orderAmount : 0;
      stats.realizedProfit += orderProfit * profitRatio;
    }
  });

  return stats;
}

/**
 * Fetches all orders for a given user from /users/{userId}/orders
 */
export async function getOrders(userId: string): Promise<Order[]> {
  if (!userId || !userId.trim()) return [];

  const ordersRef = collection(db, 'users', userId, 'orders');
  const q = query(ordersRef, orderBy('createdAt', 'desc'));

  const collectionPath = `users/${userId}/orders`;

  try {
    const snapshot = await getDocs(q);
    const orders: Order[] = [];
    snapshot.forEach((docSnap) => {
      orders.push({
        id: docSnap.id,
        ...docSnap.data(),
      } as Order);
    });

    try {
      localStorage.setItem('biznes_orders_cache', JSON.stringify(orders));
    } catch {
      // Storage quota safety
    }

    return orders;
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.LIST, collectionPath);

    try {
      const cached = localStorage.getItem('biznes_orders_cache');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // Ignore cache failure
    }
    return [];
  }
}

/**
 * Creates a new order at /users/{userId}/orders/{orderId}
 * Verifies that the customer belongs to the user.
 */
export async function createOrder(
  userId: string,
  input: CreateOrderInput,
  options?: { autoConfirm?: boolean }
): Promise<Order> {
  if (!userId || !userId.trim()) {
    throw new Error("Foydalanuvchi tizimga kirmagan");
  }

  const validation = validateOrderInput(input);
  if (!validation.isValid) {
    throw new Error(validation.errors.join('; '));
  }

  const { processedItems, totalAmount, totalCost, totalProfit } = calculateOrderFinancials(input.items);

  const ordersRef = collection(db, 'users', userId, 'orders');
  const newOrderDoc = doc(ordersRef);
  const now = new Date().toISOString();
  const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
  const docPath = `users/${userId}/orders/${newOrderDoc.id}`;

  const paymentStatus = input.paymentStatus || 'unpaid';
  let initialPaidAmount = 0;
  if (paymentStatus === 'paid') {
    initialPaidAmount = totalAmount;
  } else if (paymentStatus === 'partially_paid') {
    initialPaidAmount = typeof input.paidAmount === 'number'
      ? Math.min(totalAmount, Math.max(0, input.paidAmount))
      : 0;
  }

  const orderData: Order = {
    id: newOrderDoc.id,
    userId,
    orderNumber,
    customerId: input.customerId,
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone?.trim() || '',
    items: processedItems,
    totalAmount,
    totalCost,
    totalProfit,
    status: 'draft',
    paymentStatus,
    paidAmount: initialPaidAmount,
    stockDeducted: false,
    notes: input.notes?.trim() || '',
    createdAt: now,
    confirmedAt: null,
    cancelledAt: null,
    deliveredAt: null,
    updatedAt: now,
  };

  try {
    await setDoc(newOrderDoc, orderData);
    logFirestoreOp(OperationType.CREATE, docPath);

    // If autoConfirm requested, execute atomic stock deduction
    if (options?.autoConfirm) {
      return await confirmOrder(userId, newOrderDoc.id);
    }

    return orderData;
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.CREATE, docPath);
    const errMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`Buyurtma saqlanmadi: ${errMsg}`);
  }
}

/**
 * Confirms an order ATOMICALLY with Firestore Transaction:
 * 1. Reads order doc and verifies user ownership.
 * 2. Checks idempotency: if already confirmed/stockDeducted, returns immediately.
 * 3. Reads all products in order.items from /users/{userId}/products/{productId}.
 * 4. Verifies product ownership and stock sufficiency (product.quantity >= item.quantity).
 * 5. Deducts inventory quantities atomically and sets order status to 'confirmed', stockDeducted = true.
 * 
 * Strict rule: All reads are performed before any writes in runTransaction.
 */
export async function confirmOrder(userId: string, orderId: string): Promise<Order> {
  if (!userId || !userId.trim() || !orderId || !orderId.trim()) {
    throw new Error("Foydalanuvchi yoki buyurtma ID si noto'g'ri");
  }

  const orderRef = doc(db, 'users', userId, 'orders', orderId);

  try {
    const updatedOrder = await runTransaction(db, async (tx) => {
      // ==========================================
      // PHASE 1: ALL READS FIRST
      // ==========================================
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error("Buyurtma topilmadi");
      }

      const orderData = orderSnap.data() as Order;
      if (orderData.userId !== userId) {
        throw new Error("Ruxsat berilmagan: Ushbu buyurtma sizga tegishli emas");
      }

      // IDEMPOTENCY CHECK: If already delivered or confirmed and stock already deducted, return without duplicate deduction!
      if (orderData.status === 'delivered') {
        return orderData;
      }

      if (orderData.status === 'confirmed' && orderData.stockDeducted) {
        return orderData;
      }

      if (orderData.stockDeducted) {
        return orderData;
      }

      if (orderData.status === 'cancelled') {
        throw new Error("Bekor qilingan buyurtmani to'g'ridan-to'g'ri tasdiqlab bo'lmaydi. Yangi buyurtma yarating.");
      }

      // Read all products involved in order items
      const productDocs: { ref: any; currentData: Product; item: OrderItem }[] = [];

      for (const item of orderData.items) {
        const prodRef = doc(db, 'users', userId, 'products', item.productId);
        const prodSnap = await tx.get(prodRef);

        if (!prodSnap.exists()) {
          throw new Error(`Mahsulot omborda topilmadi: "${item.productName}"`);
        }

        const prodData = prodSnap.data() as Product;
        if (prodData.userId !== userId) {
          throw new Error(`Mahsulotga kirish huquqi yo'q: "${item.productName}"`);
        }

        // Stock sufficiency check
        const currentQty = Number(prodData.quantity) || 0;
        const requestedQty = Number(item.quantity) || 0;

        if (currentQty < requestedQty) {
          throw new Error(
            `Omborda mahsulot yetarli emas: "${item.productName}". Mavjud: ${currentQty} ${prodData.unit || 'dona'}, so'ralgan: ${requestedQty} ${prodData.unit || 'dona'}.`
          );
        }

        productDocs.push({
          ref: prodRef,
          currentData: prodData,
          item,
        });
      }

      // ==========================================
      // PHASE 2: ALL WRITES AFTER READS
      // ==========================================
      const now = new Date().toISOString();

      // 1. Deduct stock from each product
      for (const entry of productDocs) {
        const newQty = (Number(entry.currentData.quantity) || 0) - (Number(entry.item.quantity) || 0);
        tx.update(entry.ref, {
          quantity: newQty,
          updatedAt: now,
        });
      }

      // 2. Mark order as confirmed and stockDeducted = true
      const orderUpdatePayload: Partial<Order> = {
        status: 'confirmed',
        stockDeducted: true,
        confirmedAt: now,
        updatedAt: now,
      };

      tx.update(orderRef, orderUpdatePayload);

      return {
        ...orderData,
        ...orderUpdatePayload,
      } as Order;
    });

    logFirestoreOp(OperationType.WRITE, `users/${userId}/orders/${orderId}`);
    return updatedOrder;
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/orders/${orderId}`);
    throw err;
  }
}

/**
 * Cancels an order ATOMICALLY with Firestore Transaction:
 * 1. Reads order doc.
 * 2. Checks idempotency: if already cancelled, returns immediately (no duplicate refund).
 * 3. If stock was deducted (stockDeducted === true), restores the exact quantities back to products.
 * 4. Marks order status as 'cancelled' and stockDeducted = false.
 * 
 * Strict rule: All reads are performed before any writes in runTransaction.
 */
export async function cancelOrder(userId: string, orderId: string): Promise<Order> {
  if (!userId || !userId.trim() || !orderId || !orderId.trim()) {
    throw new Error("Foydalanuvchi yoki buyurtma ID si noto'g'ri");
  }

  const orderRef = doc(db, 'users', userId, 'orders', orderId);

  try {
    const updatedOrder = await runTransaction(db, async (tx) => {
      // ==========================================
      // PHASE 1: ALL READS FIRST
      // ==========================================
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error("Buyurtma topilmadi");
      }

      const orderData = orderSnap.data() as Order;
      if (orderData.userId !== userId) {
        throw new Error("Ruxsat berilmagan: Ushbu buyurtma sizga tegishli emas");
      }

      // IDEMPOTENCY CHECK: If already cancelled, do not restore stock again!
      if (orderData.status === 'cancelled') {
        return orderData;
      }

      if (orderData.status === 'delivered') {
        throw new Error("Yetkazilgan ('delivered') buyurtmani to'g'ridan-to'g'ri bekor qilib bo'lmaydi. Mahsulotlar mijozga topshirilgan.");
      }

      const productDocs: { ref: any; currentData: Product; item: OrderItem }[] = [];

      // Only need to read products if stock was actually deducted earlier
      if (orderData.stockDeducted) {
        for (const item of orderData.items) {
          const prodRef = doc(db, 'users', userId, 'products', item.productId);
          const prodSnap = await tx.get(prodRef);

          if (prodSnap.exists()) {
            const prodData = prodSnap.data() as Product;
            if (prodData.userId === userId) {
              productDocs.push({
                ref: prodRef,
                currentData: prodData,
                item,
              });
            }
          }
        }
      }

      // ==========================================
      // PHASE 2: ALL WRITES AFTER READS
      // ==========================================
      const now = new Date().toISOString();

      // Restore stock if previously deducted
      if (orderData.stockDeducted) {
        for (const entry of productDocs) {
          const newQty = (Number(entry.currentData.quantity) || 0) + (Number(entry.item.quantity) || 0);
          tx.update(entry.ref, {
            quantity: newQty,
            updatedAt: now,
          });
        }
      }

      const orderUpdatePayload: Partial<Order> = {
        status: 'cancelled',
        stockDeducted: false,
        cancelledAt: now,
        updatedAt: now,
      };

      tx.update(orderRef, orderUpdatePayload);

      return {
        ...orderData,
        ...orderUpdatePayload,
      } as Order;
    });

    logFirestoreOp(OperationType.WRITE, `users/${userId}/orders/${orderId}`);
    return updatedOrder;
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/orders/${orderId}`);
    throw err;
  }
}

/**
 * Updates order payment status ('unpaid', 'partially_paid', 'paid')
 */
export async function updateOrderPaymentStatus(
  userId: string,
  orderId: string,
  paymentStatus: OrderPaymentStatus,
  paidAmount?: number
): Promise<void> {
  if (!userId || !orderId) return;

  const docPath = `users/${userId}/orders/${orderId}`;
  const orderRef = doc(db, 'users', userId, 'orders', orderId);
  const now = new Date().toISOString();

  try {
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      throw new Error("Buyurtma topilmadi");
    }

    const orderData = orderSnap.data() as Order;
    if (orderData.userId !== userId) {
      throw new Error("Ruxsat berilmagan: Buyurtma sizga tegishli emas");
    }

    let newPaidAmount = 0;
    if (paymentStatus === 'paid') {
      newPaidAmount = orderData.totalAmount || 0;
    } else if (paymentStatus === 'partially_paid') {
      if (typeof paidAmount === 'number') {
        newPaidAmount = Math.min(orderData.totalAmount || 0, Math.max(0, paidAmount));
      } else if (typeof orderData.paidAmount === 'number') {
        newPaidAmount = orderData.paidAmount;
      } else {
        newPaidAmount = 0;
      }
    } else {
      // 'unpaid'
      newPaidAmount = 0;
    }

    await updateDoc(orderRef, {
      paymentStatus,
      paidAmount: newPaidAmount,
      updatedAt: now,
    });
    logFirestoreOp(OperationType.UPDATE, docPath);
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
    const errMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`To'lov holati yangilanmadi: ${errMsg}`);
  }
}

/**
 * Marks order as delivered
 */
export async function deliverOrder(userId: string, orderId: string): Promise<void> {
  if (!userId || !orderId) return;

  const docPath = `users/${userId}/orders/${orderId}`;
  const orderRef = doc(db, 'users', userId, 'orders', orderId);

  try {
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      throw new Error("Buyurtma topilmadi");
    }

    const orderData = orderSnap.data() as Order;
    if (orderData.userId !== userId) {
      throw new Error("Ruxsat berilmagan: Ushbu buyurtma sizga tegishli emas");
    }

    if (orderData.status === 'delivered') {
      return; // Idempotent
    }

    if (orderData.status === 'cancelled') {
      throw new Error("Bekor qilingan buyurtmani yetkazildi deb belgilab bo'lmaydi");
    }

    if (orderData.status === 'draft' || !orderData.stockDeducted) {
      throw new Error("Buyurtma hali tasdiqlanmagan va tovarlar ombordan yechilmagan. Avval buyurtmani tasdiqlang.");
    }

    const now = new Date().toISOString();
    await updateDoc(orderRef, {
      status: 'delivered',
      deliveredAt: now,
      updatedAt: now,
    });
    logFirestoreOp(OperationType.UPDATE, docPath);
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
    const errMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`Yetkazish holati yangilanmadi: ${errMsg}`);
  }
}

/**
 * Deletes an order doc from /users/{userId}/orders/{orderId}
 * Safety check: If stock is still deducted, user must cancel first to restore inventory.
 */
export async function deleteOrder(userId: string, orderId: string, stockDeducted: boolean): Promise<void> {
  if (!userId || !orderId) return;

  if (stockDeducted) {
    throw new Error(
      "Buyurtma ombordagi qoldiqni kamaytirgan. Avval buyurtmani bekor qiling, shunda tovarlar omborga qaytariladi, so'ngra o'chirishingiz mumkin."
    );
  }

  const docPath = `users/${userId}/orders/${orderId}`;
  const orderRef = doc(db, 'users', userId, 'orders', orderId);
  try {
    await deleteDoc(orderRef);
    logFirestoreOp(OperationType.DELETE, docPath);
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
    const errMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`Buyurtma o'chirilmadi: ${errMsg}`);
  }
}
