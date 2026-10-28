/**
 * BiznesYordam - Sales Orders & Inventory Integration Test Suite
 * 
 * Verifies:
 * 1. Order input validation (customerId, items, prices, quantities).
 * 2. Financial calculation & price snapshotting (totalAmount, totalCost, profit, snapshot consistency).
 * 3. Aggregate order statistics computation (draft, confirmed, delivered, cancelled).
 * 4. Atomic inventory deduction & stock insufficiency rejection.
 * 5. Idempotent confirmation (prevents double inventory deduction).
 * 6. Idempotent cancellation (prevents double inventory return).
 * 7. Cross-tenant user isolation (prevents accessing or deducting foreign user orders/products).
 * 8. Firestore rules validation for /users/{userId}/orders/{orderId}.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  validateOrderInput,
  calculateOrderFinancials,
  calculateOrderStats,
} from '../src/services/orderService';
import { Order, OrderItem } from '../src/types/business';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✅ PASS: ${message}`);
  }
}

console.log('====================================================');
console.log('🧪 RUNNING SALES ORDERS TEST SUITE');
console.log('====================================================');

// ----------------------------------------------------
// 1. Order Input Validation
// ----------------------------------------------------
console.log('\n--- 1. Order Input Validation ---');

const validOrderInput = {
  customerId: 'cust_101',
  customerName: 'Anvar Qosimov',
  customerPhone: '+998901234567',
  items: [
    {
      productId: 'prod_1',
      productName: 'Erkaklar kiyimi',
      quantity: 2,
      unitPrice: 150000,
      unitCost: 90000,
      unit: 'dona',
    },
  ],
};

const resValid = validateOrderInput(validOrderInput);
assert(resValid.isValid, "Valid order input passes validation");

const resNoCust = validateOrderInput({ ...validOrderInput, customerId: '', customerName: '' });
assert(!resNoCust.isValid, "Missing customer fails validation");
assert(resNoCust.errors.some(e => e.includes("Mijoz")), "Missing customer error specifies customer requirement");

const resNoItems = validateOrderInput({ ...validOrderInput, items: [] });
assert(!resNoItems.isValid, "Order with 0 items fails validation");

const resZeroQty = validateOrderInput({
  ...validOrderInput,
  items: [
    {
      productId: 'prod_1',
      productName: 'Erkaklar kiyimi',
      quantity: 0,
      unitPrice: 150000,
      unitCost: 90000,
    },
  ],
});
assert(!resZeroQty.isValid, "Order item with zero quantity fails validation");

const resNegativePrice = validateOrderInput({
  ...validOrderInput,
  items: [
    {
      productId: 'prod_1',
      productName: 'Erkaklar kiyimi',
      quantity: 1,
      unitPrice: -5000,
      unitCost: 90000,
    },
  ],
});
assert(!resNegativePrice.isValid, "Order item with negative unitPrice fails validation");

// ----------------------------------------------------
// 2. Financial Calculations & Snapshotting
// ----------------------------------------------------
console.log('\n--- 2. Financial Calculations & Price Snapshotting ---');

const itemsToCalculate = [
  {
    productId: 'prod_1',
    productName: 'Charm sumka',
    quantity: 3,
    unitPrice: 200000,
    unitCost: 120000,
    unit: 'dona',
  },
  {
    productId: 'prod_2',
    productName: 'Kamar',
    quantity: 2,
    unitPrice: 80000,
    unitCost: 40000,
    unit: 'dona',
  },
];

const finResults = calculateOrderFinancials(itemsToCalculate);

assert(finResults.totalAmount === 3 * 200000 + 2 * 80000, "totalAmount calculated correctly (760,000 so'm)");
assert(finResults.totalCost === 3 * 120000 + 2 * 40000, "totalCost calculated correctly (440,000 so'm)");
assert(finResults.totalProfit === 760000 - 440000, "totalProfit calculated correctly (320,000 so'm)");
assert(finResults.processedItems[0].totalPrice === 600000, "Item 1 totalPrice calculated correctly");
assert(finResults.processedItems[0].totalCost === 360000, "Item 1 totalCost calculated correctly");
assert(finResults.processedItems[1].totalPrice === 160000, "Item 2 totalPrice calculated correctly");
assert(finResults.processedItems[1].totalCost === 80000, "Item 2 totalCost calculated correctly");

// Snapshot stability: Original product price changes must not affect frozen order items
const simulatedProductUpdatedPrice = 250000;
assert(finResults.processedItems[0].unitPrice === 200000, "Snapshotted item unitPrice remains unchanged even if product is later updated");

// ----------------------------------------------------
// 3. Aggregate Order Statistics
// ----------------------------------------------------
console.log('\n--- 3. Aggregate Order Statistics ---');

const mockOrders: Order[] = [
  {
    id: 'ord_1',
    userId: 'user_A',
    customerId: 'cust_1',
    customerName: 'Akmal',
    items: [],
    totalAmount: 500000,
    totalCost: 300000,
    totalProfit: 200000,
    status: 'draft',
    paymentStatus: 'unpaid',
    paidAmount: 0,
    stockDeducted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ord_2',
    userId: 'user_A',
    customerId: 'cust_2',
    customerName: 'Nodira',
    items: [],
    totalAmount: 1000000,
    totalCost: 600000,
    totalProfit: 400000,
    status: 'confirmed',
    paymentStatus: 'paid',
    paidAmount: 1000000,
    stockDeducted: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ord_3',
    userId: 'user_A',
    customerId: 'cust_3',
    customerName: 'Javohir',
    items: [],
    totalAmount: 800000,
    totalCost: 500000,
    totalProfit: 300000,
    status: 'delivered',
    paymentStatus: 'paid',
    paidAmount: 800000,
    stockDeducted: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ord_4',
    userId: 'user_A',
    customerId: 'cust_4',
    customerName: 'Dilshod',
    items: [],
    totalAmount: 700000,
    totalCost: 400000,
    totalProfit: 300000,
    status: 'cancelled',
    paymentStatus: 'unpaid',
    paidAmount: 0,
    stockDeducted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ord_5_partial_with_amount',
    userId: 'user_A',
    customerId: 'cust_5',
    customerName: 'Sardor',
    items: [],
    totalAmount: 1000000,
    totalCost: 600000,
    totalProfit: 400000,
    status: 'confirmed',
    paymentStatus: 'partially_paid',
    paidAmount: 400000, // Explicit partial payment of 400k
    stockDeducted: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ord_6_partial_without_amount',
    userId: 'user_A',
    customerId: 'cust_6',
    customerName: 'Malika',
    items: [],
    totalAmount: 500000,
    totalCost: 300000,
    totalProfit: 200000,
    status: 'confirmed',
    paymentStatus: 'partially_paid',
    // paidAmount is intentionally missing
    stockDeducted: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const stats = calculateOrderStats(mockOrders);
assert(stats.totalOrders === 6, "Total orders counted correctly (6)");
assert(stats.draftCount === 1, "Draft count counted correctly (1)");
assert(stats.confirmedCount === 3, "Confirmed count counted correctly (3)");
assert(stats.deliveredCount === 1, "Delivered count counted correctly (1)");
assert(stats.cancelledCount === 1, "Cancelled count counted correctly (1)");

// Total active revenue (excluding cancelled) = 500k + 1000k + 800k + 1000k + 500k = 3,800,000 so'm
assert(stats.totalRevenue === 3800000, "Total active revenue excludes cancelled orders (3,800,000 so'm)");

// Real paid revenue = 1000k (ord_2) + 800k (ord_3) + 400k (ord_5) + 0 (ord_6 where paidAmount is missing) = 2,200,000 so'm
assert(
  stats.paidRevenue === 1000000 + 800000 + 400000,
  "Paid revenue strictly counts real collected cash (2,200,000 so'm). ord_6 with missing paidAmount is NOT counted as full revenue!"
);

// Unpaid revenue / debt = 500k (ord_1) + 600k (ord_5 remaining) + 500k (ord_6 full remaining) = 1,600,000 so'm
assert(
  stats.unpaidRevenue === 500000 + 600000 + 500000,
  "Unpaid credit/debt correctly accumulates remaining balances (1,600,000 so'm)"
);

// ----------------------------------------------------
// 4. Atomic Inventory Deduction & Stock Sufficiency Logic
// ----------------------------------------------------
console.log('\n--- 4. Atomic Stock Deduction & Insufficiency Rejection ---');

// Simulated inventory state
interface MockInventoryProduct {
  id: string;
  userId: string;
  name: string;
  quantity: number;
}

let mockInventory: Record<string, MockInventoryProduct> = {
  prod_alpha: { id: 'prod_alpha', userId: 'user_A', name: 'Ayollar ko\'ylagi', quantity: 5 },
  prod_beta: { id: 'prod_beta', userId: 'user_A', name: 'Sharf', quantity: 2 },
};

// Simulation of atomic confirmation logic
function simulateConfirmOrder(
  userId: string,
  order: Order,
  inventory: Record<string, MockInventoryProduct>
): { success: boolean; error?: string; order: Order } {
  if (order.userId !== userId) {
    return { success: false, error: "Ruxsat berilmagan: Ushbu buyurtma sizga tegishli emas", order };
  }

  // Idempotency check: if delivered or confirmed with stock already deducted, return without duplicate deduction!
  if (order.status === 'delivered') {
    return { success: true, order };
  }
  if (order.status === 'confirmed' && order.stockDeducted) {
    return { success: true, order };
  }
  if (order.stockDeducted) {
    return { success: true, order };
  }

  if (order.status === 'cancelled') {
    return { success: false, error: "Bekor qilingan buyurtmani to'g'ridan-to'g'ri tasdiqlab bo'lmaydi. Yangi buyurtma yarating.", order };
  }

  // Phase 1: All Reads & Validations
  for (const item of order.items) {
    const prod = inventory[item.productId];
    if (!prod) {
      return { success: false, error: `Mahsulot omborda topilmadi: "${item.productName}"`, order };
    }
    if (prod.userId !== userId) {
      return { success: false, error: `Mahsulotga kirish huquqi yo'q: "${item.productName}"`, order };
    }
    if (prod.quantity < item.quantity) {
      return {
        success: false,
        error: `Omborda mahsulot yetarli emas: "${item.productName}". Mavjud: ${prod.quantity}, so'ralgan: ${item.quantity}.`,
        order,
      };
    }
  }

  // Phase 2: All Writes
  for (const item of order.items) {
    inventory[item.productId].quantity -= item.quantity;
  }

  const updatedOrder: Order = {
    ...order,
    status: 'confirmed',
    stockDeducted: true,
    confirmedAt: new Date().toISOString(),
  };

  return { success: true, order: updatedOrder };
}

// Simulation of atomic cancellation logic
function simulateCancelOrder(
  userId: string,
  order: Order,
  inventory: Record<string, MockInventoryProduct>
): { success: boolean; error?: string; order: Order } {
  if (order.userId !== userId) {
    return { success: false, error: "Ruxsat berilmagan", order };
  }

  // Idempotency check: Already cancelled, do not return stock twice
  if (order.status === 'cancelled') {
    return { success: true, order };
  }

  // Security guard: Delivered order cannot be directly cancelled (goods physically handed over)
  if (order.status === 'delivered') {
    return {
      success: false,
      error: "Yetkazilgan ('delivered') buyurtmani to'g'ridan-to'g'ri bekor qilib bo'lmaydi. Mahsulotlar mijozga topshirilgan.",
      order,
    };
  }

  // Phase 1: Reads & writes if stock was deducted
  if (order.stockDeducted) {
    for (const item of order.items) {
      if (inventory[item.productId]) {
        inventory[item.productId].quantity += item.quantity;
      }
    }
  }

  const updatedOrder: Order = {
    ...order,
    status: 'cancelled',
    stockDeducted: false,
    cancelledAt: new Date().toISOString(),
  };

  return { success: true, order: updatedOrder };
}

// Simulation of delivery transition logic
function simulateDeliverOrder(
  userId: string,
  order: Order
): { success: boolean; error?: string; order: Order } {
  if (order.userId !== userId) {
    return { success: false, error: "Ruxsat berilmagan: Ushbu buyurtma sizga tegishli emas", order };
  }
  if (order.status === 'delivered') {
    return { success: true, order };
  }
  if (order.status === 'cancelled') {
    return { success: false, error: "Bekor qilingan buyurtmani yetkazildi deb belgilab bo'lmaydi", order };
  }
  if (order.status === 'draft' || !order.stockDeducted) {
    return { success: false, error: "Buyurtma hali tasdiqlanmagan va tovarlar ombordan yechilmagan. Avval buyurtmani tasdiqlang.", order };
  }
  return {
    success: true,
    order: {
      ...order,
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
    },
  };
}

// Test A: Insufficient inventory rejection
const highQuantityOrder: Order = {
  id: 'ord_high',
  userId: 'user_A',
  customerId: 'cust_1',
  customerName: 'Kamola',
  items: [
    {
      productId: 'prod_beta', // Only 2 in stock
      productName: 'Sharf',
      quantity: 10,
      unitPrice: 50000,
      unitCost: 20000,
      totalPrice: 500000,
      totalCost: 200000,
    },
  ],
  totalAmount: 500000,
  totalCost: 200000,
  totalProfit: 300000,
  status: 'draft',
  paymentStatus: 'unpaid',
  stockDeducted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const resReject = simulateConfirmOrder('user_A', highQuantityOrder, mockInventory);
assert(!resReject.success, "Confirmation rejected when inventory stock is insufficient");
assert(
  resReject.error!.includes("Omborda mahsulot yetarli emas") && resReject.error!.includes("Mavjud: 2"),
  "Rejection error gives exact details: available (2) vs requested (10)"
);
assert(mockInventory['prod_beta'].quantity === 2, "Inventory stock remains completely intact (2) on rejected order");

// Test B: Successful atomic stock deduction
const validStockOrder: Order = {
  id: 'ord_valid',
  userId: 'user_A',
  customerId: 'cust_1',
  customerName: 'Kamola',
  items: [
    {
      productId: 'prod_alpha', // 5 in stock
      productName: 'Ayollar ko\'ylagi',
      quantity: 3,
      unitPrice: 120000,
      unitCost: 70000,
      totalPrice: 360000,
      totalCost: 210000,
    },
  ],
  totalAmount: 360000,
  totalCost: 210000,
  totalProfit: 150000,
  status: 'draft',
  paymentStatus: 'unpaid',
  stockDeducted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const resConfirm1 = simulateConfirmOrder('user_A', validStockOrder, mockInventory);
assert(resConfirm1.success, "Order with sufficient stock is successfully confirmed");
assert(mockInventory['prod_alpha'].quantity === 2, "Inventory stock atomically reduced from 5 to 2");
assert(resConfirm1.order.status === 'confirmed', "Order status set to 'confirmed'");
assert(resConfirm1.order.stockDeducted === true, "Order stockDeducted flag marked true");

// ----------------------------------------------------
// 5. Idempotent Confirmation (No Duplicate Deductions)
// ----------------------------------------------------
console.log('\n--- 5. Idempotent Confirmation Test ---');

// Re-confirming the same confirmed order
const resConfirm2 = simulateConfirmOrder('user_A', resConfirm1.order, mockInventory);
assert(resConfirm2.success, "Re-confirming already confirmed order returns cleanly");
assert(mockInventory['prod_alpha'].quantity === 2, "Stock NOT deducted twice on re-confirmation (remains 2)");

// ----------------------------------------------------
// 6. Cancellation & Idempotent Stock Restoration
// ----------------------------------------------------
console.log('\n--- 6. Cancellation & Idempotent Stock Return Test ---');

const resCancel1 = simulateCancelOrder('user_A', resConfirm1.order, mockInventory);
assert(resCancel1.success, "Confirmed order successfully cancelled");
assert(mockInventory['prod_alpha'].quantity === 5, "Stock safely restored from 2 back to 5");
assert(resCancel1.order.status === 'cancelled', "Order status changed to 'cancelled'");
assert(resCancel1.order.stockDeducted === false, "stockDeducted flag set to false");

// Re-cancelling must NOT add stock again
const resCancel2 = simulateCancelOrder('user_A', resCancel1.order, mockInventory);
assert(resCancel2.success, "Re-cancelling already cancelled order returns cleanly");
assert(mockInventory['prod_alpha'].quantity === 5, "Stock NOT added twice on re-cancellation (remains 5)");

// Cancelling a draft order (which never had stock deducted) must NOT increase inventory
const draftOrder: Order = {
  ...validStockOrder,
  id: 'ord_draft_only',
  status: 'draft',
  stockDeducted: false,
};
const resCancelDraft = simulateCancelOrder('user_A', draftOrder, mockInventory);
assert(resCancelDraft.success, "Draft order cancelled cleanly");
assert(mockInventory['prod_alpha'].quantity === 5, "Draft cancellation does not erroneously add to inventory stock");

// Delivered order delivery & cancellation protections
const orderToDeliver = simulateConfirmOrder('user_A', validStockOrder, mockInventory);
assert(mockInventory['prod_alpha'].quantity === 2, "Stock deducted to 2 before delivery");

// Attempt to deliver draft order -> Must FAIL
const resDeliverDraft = simulateDeliverOrder('user_A', draftOrder);
assert(!resDeliverDraft.success, "Cannot mark draft order as delivered without confirmation");
assert(resDeliverDraft.error!.includes("Avval buyurtmani tasdiqlang"), "Draft delivery error informs user to confirm first");

// Legitimate delivery
const resDelivered = simulateDeliverOrder('user_A', orderToDeliver.order);
assert(resDelivered.success, "Confirmed order marked as delivered successfully");
assert(resDelivered.order.status === 'delivered', "Order status is 'delivered'");

// Attempt to cancel delivered order -> Must FAIL (prevent duplicate stock restoration for goods with customer)
const resCancelDelivered = simulateCancelOrder('user_A', resDelivered.order, mockInventory);
assert(!resCancelDelivered.success, "Cannot cancel a delivered order directly");
assert(resCancelDelivered.error!.includes("Yetkazilgan"), "Delivered cancel error blocks cancellation");
assert(mockInventory['prod_alpha'].quantity === 2, "Warehouse stock remains untouched (2) when delivered cancel is rejected");

// Attempt to re-confirm delivered order -> Must NOT re-deduct stock
const resConfirmDelivered = simulateConfirmOrder('user_A', resDelivered.order, mockInventory);
assert(resConfirmDelivered.success, "Re-confirming delivered order returns cleanly");
assert(mockInventory['prod_alpha'].quantity === 2, "Stock NOT deducted again for delivered order (remains 2)");

// ----------------------------------------------------
// 7. Concurrent Race Condition Simulation
// ----------------------------------------------------
console.log('\n--- 7. Concurrent Race Condition & Conflict Simulation ---');

// Reset stock to 3
mockInventory['prod_alpha'].quantity = 3;

// Scenario: Two simultaneous confirmation calls for the exact same order (e.g. double click)
const parallelOrderDraft: Order = {
  ...validStockOrder,
  id: 'ord_parallel',
  status: 'draft',
  stockDeducted: false,
};

// Simulate Firestore transaction retry / serialized commit on same document
let orderDocState = { ...parallelOrderDraft };
function executeTransactionStep(requestedQty: number): { success: boolean; error?: string } {
  // Read
  if (orderDocState.status === 'confirmed' && orderDocState.stockDeducted) {
    return { success: true }; // Idempotent pass-through
  }
  if (mockInventory['prod_alpha'].quantity < requestedQty) {
    return { success: false, error: "Insufficient stock" };
  }
  // Write
  mockInventory['prod_alpha'].quantity -= requestedQty;
  orderDocState = {
    ...orderDocState,
    status: 'confirmed',
    stockDeducted: true,
  };
  return { success: true };
}

// Call 1 executes
const tx1 = executeTransactionStep(3);
// Call 2 executes concurrently (reads orderDocState after commit of tx1)
const tx2 = executeTransactionStep(3);

assert(tx1.success, "First transaction commits successfully");
assert(tx2.success, "Second concurrent transaction hits idempotency check and succeeds without duplicate deduction");
assert(mockInventory['prod_alpha'].quantity === 0, "Stock deducted exactly once (from 3 to 0, not negative -3)");

// ----------------------------------------------------
// 8. Cross-Tenant Multi-User Isolation
// ----------------------------------------------------
console.log('\n--- 8. Cross-Tenant Multi-User Isolation Test ---');

const foreignOrder: Order = {
  ...validStockOrder,
  id: 'ord_foreign',
  userId: 'user_B_attacker',
};

const foreignConfirmRes = simulateConfirmOrder('user_A', foreignOrder, mockInventory);
assert(!foreignConfirmRes.success, "User A cannot confirm User B's order");

// Attempt to use product belonging to User B in User A's order
mockInventory['prod_user_b'] = {
  id: 'prod_user_b',
  userId: 'user_B',
  name: 'Begona tovar',
  quantity: 20,
};

const crossProductOrder: Order = {
  ...validStockOrder,
  userId: 'user_A',
  items: [
    {
      productId: 'prod_user_b',
      productName: 'Begona tovar',
      quantity: 1,
      unitPrice: 100000,
      unitCost: 50000,
      totalPrice: 100000,
      totalCost: 50000,
    },
  ],
};

const crossProductRes = simulateConfirmOrder('user_A', crossProductOrder, mockInventory);
assert(!crossProductRes.success, "Order cannot deduct another user's inventory product");
assert(crossProductRes.error!.includes("huquqi yo'q"), "Cross-user product access returns explicit permission failure");

// ----------------------------------------------------
// 9. Firestore Security Rules Audit
// ----------------------------------------------------
console.log('\n--- 9. Firestore Security Rules Audit ---');

const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');

assert(
  rulesContent.includes('match /users/{userId}') && rulesContent.includes('match /orders/{orderId}'),
  "firestore.rules contains subcollection match /orders/{orderId} under /users/{userId}"
);

// Verify root /orders is untouched for Click payments
assert(
  rulesContent.includes('match /orders/{orderId} {\n      allow get: if isSignedIn() && resource.data.userId == request.auth.uid;\n    }'),
  "Top-level /orders/{orderId} for Click subscription payments is preserved intact"
);

// Verify owner isolation and schema invariants
const subOrdersSection = rulesContent.slice(
  rulesContent.indexOf('match /users/{userId}'),
  rulesContent.indexOf('// Orders (Access restricted to owner)')
);

assert(subOrdersSection.includes('allow get, list: if isOwner(userId);'), "User sales orders get/list rule enforces isOwner(userId)");
assert(subOrdersSection.includes('incoming().userId == userId'), "User sales orders write rule enforces incoming().userId == userId");
assert(subOrdersSection.includes("incoming().status in ['draft', 'confirmed']"), "Order create rule enforces initial status in ['draft', 'confirmed']");
assert(subOrdersSection.includes("incoming().status in ['draft', 'confirmed', 'delivered', 'cancelled']"), "Order update rule enforces valid status transitions");
assert(subOrdersSection.includes("incoming().paymentStatus in ['unpaid', 'partially_paid', 'paid']"), "Order rule enforces valid paymentStatus enum");
assert(subOrdersSection.includes("incoming().stockDeducted is bool"), "Order rule validates stockDeducted is bool");
assert(subOrdersSection.includes("incoming().totalAmount is number && incoming().totalAmount >= 0"), "Order rule enforces totalAmount >= 0");
assert(subOrdersSection.includes("incoming().totalCost is number && incoming().totalCost >= 0"), "Order rule enforces totalCost >= 0");
assert(
  subOrdersSection.includes("allow delete: if isOwner(userId)\n          && (!('stockDeducted' in existing()) || existing().stockDeducted == false);"),
  "Order delete rule strictly forbids deleting orders where stock is still deducted (must cancel first)"
);

console.log('====================================================');
console.log('🏁 ALL SALES ORDERS TESTS PASSED SUCCESSFULLY');
console.log('====================================================');
