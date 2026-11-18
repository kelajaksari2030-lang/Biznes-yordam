/**
 * BiznesYordam - Firebase Cloud Functions
 * Callable function for authoritative daily ad quota enforcement
 * 
 * Target Project: gen-lang-client-0498548617
 * Target Named Firestore Database: ai-studio-biznesyordam-e0d6389f-9af4-4469-a3e0-1826035a54fd
 * Target Region: asia-southeast1
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { resolveAuthorizedQuota } from './subscriptionAuthorization';
import {
  getTashkentDateKey,
  PlanType,
  AdFormData,
  generateAdText,
} from './generateAdHandler';

// Initialize Firebase Admin SDK
if (getApps().length === 0) {
  initializeApp();
}

// CRITICAL: Must target the provisioned named database
export const NAMED_DATABASE_ID = 'ai-studio-biznesyordam-e0d6389f-9af4-4469-a3e0-1826035a54fd';
export const db = getFirestore(NAMED_DATABASE_ID);

/**
 * Callable function: generateAd
 * Region: asia-southeast1
 */
export const generateAd = onCall(
  {
    region: 'asia-southeast1',
    cors: true,
  },
  async (request) => {
    // 1. Mandatory Firebase Authentication
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError(
        'unauthenticated',
        "Foydalanuvchi tizimga kirmagan. Reklama yaratish uchun Google orqali kirish shart."
      );
    }

    const userId = request.auth.uid;
    const isAdmin = request.auth.token.admin === true;
    const rawData = request.data as Partial<AdFormData>;

    // 2. Validate input
    const productName = (rawData.productName || '').trim();
    if (!productName) {
      throw new HttpsError(
        'invalid-argument',
        "Mahsulot yoki xizmat nomi ko'rsatilishi shart."
      );
    }

    const formData: AdFormData = {
      productName,
      targetAudience: (rawData.targetAudience || '').trim(),
      keyBenefits: (rawData.keyBenefits || '').trim(),
      platform: rawData.platform === 'instagram' ? 'instagram' : 'telegram',
      tone: ['friendly', 'formal', 'short', 'urgent'].includes(rawData.tone as string)
        ? (rawData.tone as any)
        : 'friendly',
      variant: ['classic', 'discount', 'problem_solution', 'social_proof'].includes(
        rawData.variant as string
      )
        ? (rawData.variant as any)
        : 'classic',
      specialOffer: (rawData.specialOffer || '').trim(),
      contactInfo: (rawData.contactInfo || '').trim(),
    };

    const dateKey = getTashkentDateKey(new Date());

    const userDocRef = db.collection('users').doc(userId);
    const usageDocRef = userDocRef.collection('usage').doc(dateKey);

    // 3. Atomically check plan & quota and increment usage counter
    try {
      const quotaResult = await db.runTransaction(async (transaction) => {
        // Read user profile strictly from Firestore (server-side single source of truth)
        const userSnap = await transaction.get(userDocRef);

        const profileData = userSnap.exists ? userSnap.data() : undefined;
        const quota = resolveAuthorizedQuota(
          profileData?.currentPlan,
          profileData?.subscriptionStatus,
          profileData?.planExpiresAt,
          isAdmin
        );
        const userPlan: PlanType = quota.plan;
        const limit = quota.dailyLimit;

        // Read usage record for today (Asia/Tashkent date)
        const usageSnap = await transaction.get(usageDocRef);
        const currentCount = usageSnap.exists ? usageSnap.data()?.adCount || 0 : 0;

        // Quota check
        if (currentCount >= limit) {
          throw new HttpsError(
            'resource-exhausted',
            `Bugun uchun belgilangan kunlik ${limit} ta reklama limiti to'ldi (${userPlan.toUpperCase()} tarifi). Yangi kvota ertaga Toshkent vaqti bilan 00:00 da beriladi.`,
            {
              currentCount,
              dailyLimit: limit,
              remaining: 0,
              plan: userPlan,
              date: dateKey,
            }
          );
        }

        // Increment usage
        const newCount = currentCount + 1;
        const nowIso = new Date().toISOString();

        if (usageSnap.exists) {
          transaction.update(usageDocRef, {
            adCount: newCount,
            lastGeneratedAt: nowIso,
          });
        } else {
          transaction.set(usageDocRef, {
            id: dateKey,
            userId,
            date: dateKey,
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

      // 4. Deterministic ad generation strictly on server
      const adText = generateAdText(formData);

      return {
        success: true,
        adText,
        ...quotaResult,
      };
    } catch (error: any) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error('Error generating ad in Cloud Function:', error);
      throw new HttpsError('internal', error?.message || 'Serverda xatolik yuz berdi.');
    }
  }
);
