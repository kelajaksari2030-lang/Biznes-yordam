/**
 * BiznesYordam - Server-side Quota Service
 * Executes atomic Firestore transactions against named database
 */

import { adminDb } from './firebaseAdmin.js';
import { AdFormData, generateAdText } from './adGenerator.js';
import { isAdminUser } from './adminAuthorization.js';

export const TIMEZONE = 'Asia/Tashkent';

export const PLAN_DAILY_LIMITS = {
  free: 5,
  pro: 50,
  ultra: 200,
} as const;

export type PlanType = 'free' | 'pro' | 'ultra';

export class QuotaExceededError extends Error {
  currentCount: number;
  dailyLimit: number;
  plan: PlanType;
  date: string;

  constructor(currentCount: number, dailyLimit: number, plan: PlanType, date: string) {
    super(
      `Bugun uchun belgilangan kunlik ${dailyLimit} ta reklama limiti to'ldi (${plan.toUpperCase()} tarifi). Yangi kvota ertaga Toshkent vaqti bilan 00:00 da yangilanadi.`
    );
    this.name = 'QuotaExceededError';
    this.currentCount = currentCount;
    this.dailyLimit = dailyLimit;
    this.plan = plan;
    this.date = date;
  }
}

/**
 * Derives the calendar date in Asia/Tashkent (UTC+5) as YYYY-MM-DD.
 */
export function getTashkentDateKey(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

export interface QuotaGenerationResult {
  adText: string;
  adCount: number;
  dailyLimit: number;
  remaining: number;
  plan: PlanType;
  date: string;
}

/**
 * Executes authoritative atomic quota check and ad generation against Firestore.
 */
export async function enforceQuotaAndGenerateAd(
  userId: string,
  formData: AdFormData & { simulatedTier?: string },
  hasAdminClaim = false
): Promise<QuotaGenerationResult> {
  const dateKey = getTashkentDateKey(new Date());
  const userDocRef = adminDb.collection('users').doc(userId);

  const quotaResult = await adminDb.runTransaction(async (transaction) => {
    // 1. Authoritative User Profile read (single source of truth)
    const userSnap = await transaction.get(userDocRef);

    let userPlan: PlanType = 'free';
    let limit: number = PLAN_DAILY_LIMITS.free;
    let targetUsageDateKey = dateKey;

    if (userSnap.exists) {
      const profile = userSnap.data();
      const plan = profile?.currentPlan;
      const isAdminAccount = isAdminUser(userId, hasAdminClaim);
      const requestedSimulatedTier = formData?.simulatedTier;

      if (isAdminAccount && ['free', 'pro', 'ultra'].includes(requestedSimulatedTier || '')) {
        userPlan = requestedSimulatedTier as PlanType;
        limit = PLAN_DAILY_LIMITS[userPlan];
        targetUsageDateKey = `simulated_${requestedSimulatedTier}_${dateKey}`;
      } else if (isAdminAccount) {
        userPlan = 'ultra';
        limit = 999999;
      } else if (
        (plan === 'pro' || plan === 'ultra') &&
        profile?.subscriptionStatus !== 'expired'
      ) {
        userPlan = plan;
        limit = PLAN_DAILY_LIMITS[userPlan];
      }
    }

    const usageDocRef = userDocRef.collection('usage').doc(targetUsageDateKey);

    // 2. Authoritative Usage Document read
    const usageSnap = await transaction.get(usageDocRef);
    const currentCount = usageSnap.exists ? usageSnap.data()?.adCount || 0 : 0;

    // 3. Quota check
    if (currentCount >= limit) {
      throw new QuotaExceededError(currentCount, limit, userPlan, targetUsageDateKey);
    }

    // 4. Atomic Increment
    const newCount = currentCount + 1;
    const nowIso = new Date().toISOString();

    if (usageSnap.exists) {
      transaction.update(usageDocRef, {
        adCount: newCount,
        lastGeneratedAt: nowIso,
      });
    } else {
      transaction.set(usageDocRef, {
        id: targetUsageDateKey,
        userId,
        date: targetUsageDateKey,
        adCount: newCount,
        lastGeneratedAt: nowIso,
      });
    }

    return {
      adCount: newCount,
      dailyLimit: limit,
      remaining: Math.max(0, limit - newCount),
      plan: userPlan,
      date: dateKey,
    };
  });

  // 5. Deterministic Ad Generation executed authoritatively on server
  const adText = generateAdText(formData);

  return {
    adText,
    ...quotaResult,
  };
}
