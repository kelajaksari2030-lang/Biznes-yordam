/**
 * BiznesYordam - Authoritative Backend Daily Ad Quota Enforcement Engine
 * 
 * Rules:
 * 1. Plan limits: Free = 5, Pro = 50, Ultra = 200 per user per day.
 * 2. Timezone policy: Asia/Tashkent (UTC+5), formatted as YYYY-MM-DD.
 * 3. Atomic transaction enforcement: Concurrency-safe against race conditions.
 * 4. Plan read strictly from trusted user profile (/users/{uid}), never client state.
 * 5. Deterministic Uzbek ad generation runs strictly on the backend.
 */

import { AdFormData } from '../types';
import { generateAdText } from '../data/adTemplates';

export const TIMEZONE = 'Asia/Tashkent';

export const PLAN_DAILY_LIMITS: Record<'free' | 'pro' | 'ultra', number> = {
  free: 5,
  pro: 50,
  ultra: 200,
};

export type PlanType = 'free' | 'pro' | 'ultra';

export class QuotaError extends Error {
  code: 'unauthenticated' | 'resource-exhausted' | 'invalid-argument' | 'internal';
  status: number;
  details?: {
    currentCount?: number;
    dailyLimit?: number;
    remaining?: number;
    plan?: PlanType;
    date?: string;
  };

  constructor(
    code: 'unauthenticated' | 'resource-exhausted' | 'invalid-argument' | 'internal',
    message: string,
    details?: {
      currentCount?: number;
      dailyLimit?: number;
      remaining?: number;
      plan?: PlanType;
      date?: string;
    }
  ) {
    super(message);
    this.name = 'QuotaError';
    this.code = code;
    this.status = code === 'unauthenticated' ? 401 : code === 'resource-exhausted' ? 429 : 400;
    this.details = details;
  }
}

/**
 * Derives the project-local calendar date in Asia/Tashkent (UTC+5) as YYYY-MM-DD.
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

export interface QuotaEnforcementSuccess {
  adText: string;
  adCount: number;
  dailyLimit: number;
  remaining: number;
  plan: PlanType;
  date: string;
}

/**
 * Generic interface for transactional key-value or document store.
 * Allows identical execution across Firebase Admin SDK and test simulators.
 */
export interface TransactionalStore {
  runTransaction<T>(updateFunction: (transaction: StoreTransaction) => Promise<T>): Promise<T>;
}

export interface StoreTransaction {
  getUserProfile(userId: string): Promise<{ currentPlan?: string; subscriptionStatus?: string } | null>;
  getDailyUsage(userId: string, dateKey: string): Promise<{ adCount?: number } | null>;
  incrementDailyUsage(
    userId: string,
    dateKey: string,
    newCount: number,
    exists: boolean
  ): Promise<void>;
}

/**
 * Validates and sanitizes incoming AdFormData
 */
export function validateAdFormData(data: any): AdFormData {
  if (!data || typeof data !== 'object') {
    throw new QuotaError('invalid-argument', "Reklama ma'lumotlari kiritilishi shart.");
  }

  const productName = String(data.productName || '').trim();
  if (!productName) {
    throw new QuotaError('invalid-argument', "Mahsulot yoki xizmat nomi ko'rsatilishi shart.");
  }

  const platform = data.platform === 'instagram' ? 'instagram' : 'telegram';
  const tone = ['friendly', 'formal', 'short', 'urgent'].includes(data.tone) ? data.tone : 'friendly';
  const variant = ['classic', 'discount', 'problem_solution', 'social_proof'].includes(data.variant)
    ? data.variant
    : 'classic';

  return {
    productName,
    targetAudience: String(data.targetAudience || '').trim(),
    keyBenefits: String(data.keyBenefits || '').trim(),
    platform,
    tone,
    variant,
    specialOffer: String(data.specialOffer || '').trim(),
    contactInfo: String(data.contactInfo || '').trim(),
  };
}

/**
 * Authoritative Server-Side Ad Generation & Quota Enforcement Core
 * Runs inside an atomic transaction.
 */
export async function executeQuotaEnforcedAdGeneration(
  store: TransactionalStore,
  userId: string | undefined | null,
  rawFormData: any,
  now: Date = new Date()
): Promise<QuotaEnforcementSuccess> {
  // 1. Mandatory Authentication Check
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new QuotaError(
      'unauthenticated',
      "Foydalanuvchi tizimga kirmagan. Reklama yaratish uchun Google orqali tizimga kirish talab etiladi."
    );
  }

  // 2. Validate input parameters
  const formData = validateAdFormData(rawFormData);
  const dateKey = getTashkentDateKey(now);

  // 3. Execute atomic transaction
  const quotaResult = await store.runTransaction(async (transaction) => {
    // A. Read user profile from authoritative Firestore collection (/users/{uid})
    const userDoc = await transaction.getUserProfile(userId);
    
    // Default strictly to 'free'. Never trust client inputs.
    let userPlan: PlanType = 'free';
    if (userDoc?.currentPlan === 'pro' || userDoc?.currentPlan === 'ultra') {
      // Check subscription status
      if (userDoc.subscriptionStatus !== 'expired') {
        userPlan = userDoc.currentPlan;
      }
    }

    const limit = PLAN_DAILY_LIMITS[userPlan];

    // B. Read today's usage document (/users/{uid}/usage/{dateKey})
    const usageDoc = await transaction.getDailyUsage(userId, dateKey);
    const currentCount = usageDoc?.adCount ?? 0;

    // C. Atomic quota limit gate
    if (currentCount >= limit) {
      throw new QuotaError(
        'resource-exhausted',
        `Bugun uchun belgilangan kunlik ${limit} ta reklama limiti to'ldi (${userPlan.toUpperCase()} tarifi). Ertaga Toshkent vaqti bilan 00:00 da yangilanadi.`,
        {
          currentCount,
          dailyLimit: limit,
          remaining: 0,
          plan: userPlan,
          date: dateKey,
        }
      );
    }

    // D. Increment usage count atomically
    const newCount = currentCount + 1;
    await transaction.incrementDailyUsage(userId, dateKey, newCount, !!usageDoc);

    return {
      adCount: newCount,
      dailyLimit: limit,
      remaining: Math.max(0, limit - newCount),
      plan: userPlan,
      date: dateKey,
    };
  });

  // 4. Deterministic ad generation execution on backend
  const adText = generateAdText(formData);

  return {
    adText,
    ...quotaResult,
  };
}
