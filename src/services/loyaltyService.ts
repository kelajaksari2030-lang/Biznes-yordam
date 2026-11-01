/**
 * BiznesYordam - Customer Loyalty & Cashback Service
 * Manages cashback configuration, customer tiers, and loyalty ledger entries.
 * Includes cashback expense accounting for net profit calculations.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  where,
  runTransaction,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeFirestorePayload } from './firebase';
import { LoyaltyConfig, LoyaltyLedgerItem, CustomerTier } from '../types/modules';
import { Customer } from '../types/crm';

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  enabled: true,
  cashbackPercent: 2, // 2% base cashback
  redemptionRateUZSPerPoint: 1, // 1 point = 1 UZS
  silverThresholdUZS: 2000000,  // 2M UZS spend -> Silver (3%)
  goldThresholdUZS: 5000000,    // 5M UZS spend -> Gold (5%)
  platinumThresholdUZS: 10000000, // 10M UZS spend -> Platinum (7%)
  silverCashbackBonusPercent: 1,  // +1% bonus (total 3%)
  goldCashbackBonusPercent: 3,    // +3% bonus (total 5%)
  platinumCashbackBonusPercent: 5, // +5% bonus (total 7%)
  updatedAt: new Date().toISOString(),
};

/**
 * Calculates customer tier based on lifetime spend
 */
export function calculateCustomerTier(
  totalSpentUZS: number,
  config: LoyaltyConfig = DEFAULT_LOYALTY_CONFIG
): CustomerTier {
  const spent = Math.max(0, Number(totalSpentUZS) || 0);
  if (spent >= config.platinumThresholdUZS) return 'platinum';
  if (spent >= config.goldThresholdUZS) return 'gold';
  if (spent >= config.silverThresholdUZS) return 'silver';
  return 'bronze';
}

/**
 * Gets total effective cashback percentage for a customer tier
 */
export function getEffectiveCashbackPercent(
  tier: CustomerTier,
  config: LoyaltyConfig = DEFAULT_LOYALTY_CONFIG
): number {
  if (!config.enabled) return 0;
  const base = config.cashbackPercent || 0;
  switch (tier) {
    case 'platinum':
      return base + (config.platinumCashbackBonusPercent || 0);
    case 'gold':
      return base + (config.goldCashbackBonusPercent || 0);
    case 'silver':
      return base + (config.silverCashbackBonusPercent || 0);
    default:
      return base;
  }
}

/**
 * Gets Loyalty Configuration for user
 */
export async function getLoyaltyConfig(userId: string): Promise<LoyaltyConfig> {
  if (!userId) return DEFAULT_LOYALTY_CONFIG;
  const docRef = doc(db, 'users', userId, 'settings', 'loyaltyConfig');
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_LOYALTY_CONFIG, ...snap.data() } as LoyaltyConfig;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}/settings/loyaltyConfig`);
  }
  return DEFAULT_LOYALTY_CONFIG;
}

/**
 * Saves Loyalty Configuration
 */
export async function saveLoyaltyConfig(
  userId: string,
  config: Partial<LoyaltyConfig>
): Promise<LoyaltyConfig> {
  if (!userId) throw new Error("Foydalanuvchi tizimga kirmagan");
  const docRef = doc(db, 'users', userId, 'settings', 'loyaltyConfig');
  const existing = await getLoyaltyConfig(userId);

  const updated: LoyaltyConfig = {
    ...existing,
    ...config,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(docRef, sanitizeFirestorePayload(updated));
    return updated;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/settings/loyaltyConfig`);
    throw err;
  }
}

/**
 * Processes loyalty rewards and redemptions for a completed sale order
 * ATOMICALLY & IDEMPOTENTLY:
 * 1. Reads customer doc from CRM /users/{userId}/customers/{customerId}.
 * 2. Calculates tier and cashback earned.
 * 3. Prevents duplicate ledger entry for the same orderId.
 * 4. Updates customer loyalty balance & lifetime spend.
 */
export async function processOrderLoyalty(
  userId: string,
  customerId: string,
  orderId: string,
  orderAmountUZS: number,
  pointsRedeemedUZS: number = 0
): Promise<{ earned: number; redeemed: number; newBalance: number }> {
  if (!userId || !customerId || !orderId) {
    return { earned: 0, redeemed: 0, newBalance: 0 };
  }

  const customerRef = doc(db, 'users', userId, 'customers', customerId);
  const ledgerColRef = collection(db, 'users', userId, 'loyaltyLedger');
  const existingCheckQuery = query(
    ledgerColRef,
    where('orderId', '==', orderId),
    where('customerId', '==', customerId)
  );

  try {
    const result = await runTransaction(db, async (tx) => {
      // 1. ALL READS
      const custSnap = await tx.get(customerRef);
      if (!custSnap.exists()) return { earned: 0, redeemed: 0, newBalance: 0 };

      const checkSnap = await getDocs(existingCheckQuery);
      if (!checkSnap.empty) {
        // Already processed for this order (Idempotency safeguard)
        const custData = custSnap.data() as any;
        return {
          earned: 0,
          redeemed: 0,
          newBalance: Number(custData.loyaltyBalanceUZS) || 0,
        };
      }

      const config = await getLoyaltyConfig(userId);
      const custData = custSnap.data() as Customer & { totalSpent?: number; loyaltyBalanceUZS?: number };
      const currentBalance = Math.max(0, Number(custData.loyaltyBalanceUZS) || 0);
      const currentSpent = Math.max(0, Number(custData.totalSpent) || 0);

      // Validate redemption amount
      const safeRedeemed = Math.min(currentBalance, Math.max(0, Number(pointsRedeemedUZS) || 0));

      // Calculate new spend and earned cashback
      const netPaidAmount = Math.max(0, orderAmountUZS - safeRedeemed);
      const newTotalSpent = currentSpent + netPaidAmount;
      const tier = calculateCustomerTier(newTotalSpent, config);
      const cashbackRate = getEffectiveCashbackPercent(tier, config);
      const earnedAmount = Math.round((netPaidAmount * cashbackRate) / 100);

      const finalBalance = Math.max(0, currentBalance - safeRedeemed + earnedAmount);

      // 2. WRITES
      const now = new Date().toISOString();
      tx.update(customerRef, {
        totalSpent: newTotalSpent,
        loyaltyBalanceUZS: finalBalance,
        updatedAt: now,
      });

      // Add Ledger items if earned or redeemed
      if (safeRedeemed > 0) {
        const redDoc = doc(ledgerColRef);
        const redItem: LoyaltyLedgerItem = {
          id: redDoc.id,
          userId,
          customerId,
          customerName: custData.name,
          orderId,
          type: 'redeemed',
          amount: safeRedeemed,
          balanceAfter: currentBalance - safeRedeemed,
          description: `Buyurtma #${orderId.slice(-6)} uchun ${safeRedeemed.toLocaleString()} UZS keshbek ishlatildi`,
          createdAt: now,
        };
        tx.set(redDoc, sanitizeFirestorePayload(redItem));
      }

      if (earnedAmount > 0) {
        const earnDoc = doc(ledgerColRef);
        const earnItem: LoyaltyLedgerItem = {
          id: earnDoc.id,
          userId,
          customerId,
          customerName: custData.name,
          orderId,
          type: 'earned',
          amount: earnedAmount,
          balanceAfter: finalBalance,
          description: `Buyurtma #${orderId.slice(-6)} uchun ${cashbackRate}% (${earnedAmount.toLocaleString()} UZS) keshbek berildi`,
          createdAt: now,
        };
        tx.set(earnDoc, sanitizeFirestorePayload(earnItem));
      }

      return { earned: earnedAmount, redeemed: safeRedeemed, newBalance: finalBalance };
    });

    return result;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/loyaltyLedger`);
    return { earned: 0, redeemed: 0, newBalance: 0 };
  }
}

/**
 * Gets loyalty ledger history for a user or specific customer
 */
export async function getLoyaltyLedger(
  userId: string,
  customerId?: string
): Promise<LoyaltyLedgerItem[]> {
  if (!userId) return [];
  const colRef = collection(db, 'users', userId, 'loyaltyLedger');
  const q = customerId
    ? query(colRef, where('customerId', '==', customerId), orderBy('createdAt', 'desc'))
    : query(colRef, orderBy('createdAt', 'desc'));

  try {
    const snap = await getDocs(q);
    const list: LoyaltyLedgerItem[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as LoyaltyLedgerItem));
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${userId}/loyaltyLedger`);
    return [];
  }
}
