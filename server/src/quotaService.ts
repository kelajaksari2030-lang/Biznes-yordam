/**
 * BiznesYordam - Server-side Quota Service
 * Executes atomic Firestore transactions against named database
 */

import { adminDb } from './firebaseAdmin.js';
import { AdFormData } from './adGenerator.js';
import {
  generateAdWithGemini,
  GeminiCallOptions,
} from './geminiService.js';

export const ADMIN_EMAIL = 'kelajaksari2030@gmail.com';

export function isAdminUser(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

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
      `Bugun uchun belgilangan kunlik ${dailyLimit} ta AI so'rov limiti to'ldi (${plan.toUpperCase()} tarifi). Yangi kvota ertaga Toshkent vaqti bilan 00:00 da yangilanadi.`
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

export interface QuotaInfo {
  adCount: number;
  dailyLimit: number;
  remaining: number;
  plan: PlanType;
  date: string;
}

export interface QuotaReservation extends QuotaInfo {
  targetUsageDateKey: string;
}

export interface QuotaStoreTransaction {
  getUserProfile(userId: string): Promise<{
    email?: string;
    currentPlan?: string;
    subscriptionStatus?: string;
  } | null>;
  getUsage(userId: string, usageDateKey: string): Promise<{ adCount?: number } | null>;
  setUsage(userId: string, usageDateKey: string, adCount: number, nowIso: string): Promise<void>;
  updateUsage(userId: string, usageDateKey: string, adCount: number, nowIso: string): Promise<void>;
}

export interface QuotaStore {
  runTransaction<T>(fn: (tx: QuotaStoreTransaction) => Promise<T>): Promise<T>;
}

export const firestoreQuotaStore: QuotaStore = {
  async runTransaction<T>(fn: (tx: QuotaStoreTransaction) => Promise<T>): Promise<T> {
    return adminDb.runTransaction(async (transaction) => {
      const tx: QuotaStoreTransaction = {
        async getUserProfile(userId: string) {
          const userSnap = await transaction.get(adminDb.collection('users').doc(userId));
          if (!userSnap.exists) return null;
          return (userSnap.data() || null) as any;
        },
        async getUsage(userId: string, usageDateKey: string) {
          const usageRef = adminDb.collection('users').doc(userId).collection('usage').doc(usageDateKey);
          const usageSnap = await transaction.get(usageRef);
          if (!usageSnap.exists) return null;
          return (usageSnap.data() || null) as any;
        },
        async setUsage(userId: string, usageDateKey: string, adCount: number, nowIso: string) {
          const usageRef = adminDb.collection('users').doc(userId).collection('usage').doc(usageDateKey);
          transaction.set(usageRef, {
            id: usageDateKey,
            userId,
            date: usageDateKey,
            adCount,
            lastGeneratedAt: nowIso,
          });
        },
        async updateUsage(userId: string, usageDateKey: string, adCount: number, nowIso: string) {
          const usageRef = adminDb.collection('users').doc(userId).collection('usage').doc(usageDateKey);
          transaction.update(usageRef, {
            adCount,
            lastGeneratedAt: nowIso,
          });
        },
      };
      return fn(tx);
    });
  },
};

export async function reserveAiQuota(
  userId: string,
  simulatedTier?: string,
  store: QuotaStore = firestoreQuotaStore,
  now: Date = new Date()
): Promise<QuotaReservation> {
  const dateKey = getTashkentDateKey(now);

  return store.runTransaction(async (tx) => {
    const profile = await tx.getUserProfile(userId);

    let userPlan: PlanType = 'free';
    let limit: number = PLAN_DAILY_LIMITS.free;
    let targetUsageDateKey = dateKey;

    if (profile) {
      const email = profile.email;
      const plan = profile.currentPlan;
      const isAdmin = isAdminUser(email);

      if (isAdmin && ['free', 'pro', 'ultra'].includes(simulatedTier || '')) {
        userPlan = simulatedTier as PlanType;
        limit = PLAN_DAILY_LIMITS[userPlan];
        targetUsageDateKey = `simulated_${simulatedTier}_${dateKey}`;
      } else if (isAdmin) {
        userPlan = 'ultra';
        limit = 999999;
      } else if (
        (plan === 'pro' || plan === 'ultra') &&
        profile.subscriptionStatus !== 'expired'
      ) {
        userPlan = plan;
        limit = PLAN_DAILY_LIMITS[userPlan];
      }
    }

    const usageData = await tx.getUsage(userId, targetUsageDateKey);
    const currentCount = usageData?.adCount || 0;

    if (currentCount >= limit) {
      throw new QuotaExceededError(currentCount, limit, userPlan, targetUsageDateKey);
    }

    const newCount = currentCount + 1;
    const nowIso = now.toISOString();

    if (usageData) {
      await tx.updateUsage(userId, targetUsageDateKey, newCount, nowIso);
    } else {
      await tx.setUsage(userId, targetUsageDateKey, newCount, nowIso);
    }

    return {
      adCount: newCount,
      dailyLimit: limit,
      remaining: Math.max(0, limit - newCount),
      plan: userPlan,
      date: dateKey,
      targetUsageDateKey,
    };
  });
}

export async function refundAiQuota(
  userId: string,
  targetUsageDateKey: string,
  store: QuotaStore = firestoreQuotaStore
): Promise<void> {
  try {
    await store.runTransaction(async (tx) => {
      const usageData = await tx.getUsage(userId, targetUsageDateKey);
      const currentCount = usageData?.adCount || 0;
      if (!usageData || currentCount <= 0) return;

      await tx.updateUsage(
        userId,
        targetUsageDateKey,
        Math.max(0, currentCount - 1),
        new Date().toISOString()
      );
    });
  } catch (err) {
    console.warn('Best-effort AI quota refund failed:', err);
  }
}

export async function executeWithAiQuota<T>(
  userId: string,
  simulatedTier: string | undefined,
  task: () => Promise<T>,
  options?: { quotaStore?: QuotaStore; now?: Date }
): Promise<{ result: T; quota: QuotaInfo }> {
  const store = options?.quotaStore || firestoreQuotaStore;
  const reservation = await reserveAiQuota(userId, simulatedTier, store, options?.now);

  try {
    const result = await task();
    const { targetUsageDateKey: _omit, ...quota } = reservation;
    return { result, quota };
  } catch (err) {
    await refundAiQuota(userId, reservation.targetUsageDateKey, store);
    throw err;
  }
}

export interface QuotaGenerationResult extends QuotaInfo {
  adText: string;
  headline?: string;
  hashtags?: string[];
}

/**
 * Executes authoritative atomic quota check and Gemini ad generation against Firestore.
 */
export async function enforceQuotaAndGenerateAd(
  userId: string,
  formData: AdFormData & { simulatedTier?: string },
  options?: {
    quotaStore?: QuotaStore;
    geminiOptions?: GeminiCallOptions;
    now?: Date;
  }
): Promise<QuotaGenerationResult> {
  const { result, quota } = await executeWithAiQuota(
    userId,
    formData.simulatedTier,
    () => generateAdWithGemini(formData, options?.geminiOptions),
    { quotaStore: options?.quotaStore, now: options?.now }
  );

  return {
    adText: result.adText,
    headline: result.headline,
    hashtags: result.hashtags,
    ...quota,
  };
}
