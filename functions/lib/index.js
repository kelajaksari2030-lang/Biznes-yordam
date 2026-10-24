"use strict";
/**
 * BiznesYordam - Firebase Cloud Functions
 * Callable function for authoritative daily ad quota enforcement
 *
 * Target Project: gen-lang-client-0498548617
 * Target Named Firestore Database: ai-studio-biznesyordam-e0d6389f-9af4-4469-a3e0-1826035a54fd
 * Target Region: asia-southeast1
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAd = exports.db = exports.NAMED_DATABASE_ID = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const generateAdHandler_1 = require("./generateAdHandler");
// Initialize Firebase Admin SDK
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
// CRITICAL: Must target the provisioned named database
exports.NAMED_DATABASE_ID = 'ai-studio-biznesyordam-e0d6389f-9af4-4469-a3e0-1826035a54fd';
exports.db = (0, firestore_1.getFirestore)(exports.NAMED_DATABASE_ID);
/**
 * Callable function: generateAd
 * Region: asia-southeast1
 */
exports.generateAd = (0, https_1.onCall)({
    region: 'asia-southeast1',
    cors: true,
}, async (request) => {
    // 1. Mandatory Firebase Authentication
    if (!request.auth || !request.auth.uid) {
        throw new https_1.HttpsError('unauthenticated', "Foydalanuvchi tizimga kirmagan. Reklama yaratish uchun Google orqali kirish shart.");
    }
    const userId = request.auth.uid;
    const rawData = request.data;
    // 2. Validate input
    const productName = (rawData.productName || '').trim();
    if (!productName) {
        throw new https_1.HttpsError('invalid-argument', "Mahsulot yoki xizmat nomi ko'rsatilishi shart.");
    }
    const formData = {
        productName,
        targetAudience: (rawData.targetAudience || '').trim(),
        keyBenefits: (rawData.keyBenefits || '').trim(),
        platform: rawData.platform === 'instagram' ? 'instagram' : 'telegram',
        tone: ['friendly', 'formal', 'short', 'urgent'].includes(rawData.tone)
            ? rawData.tone
            : 'friendly',
        variant: ['classic', 'discount', 'problem_solution', 'social_proof'].includes(rawData.variant)
            ? rawData.variant
            : 'classic',
        specialOffer: (rawData.specialOffer || '').trim(),
        contactInfo: (rawData.contactInfo || '').trim(),
    };
    const dateKey = (0, generateAdHandler_1.getTashkentDateKey)(new Date());
    const userDocRef = exports.db.collection('users').doc(userId);
    const usageDocRef = userDocRef.collection('usage').doc(dateKey);
    // 3. Atomically check plan & quota and increment usage counter
    try {
        const quotaResult = await exports.db.runTransaction(async (transaction) => {
            // Read user profile strictly from Firestore (server-side single source of truth)
            const userSnap = await transaction.get(userDocRef);
            let userPlan = 'free';
            if (userSnap.exists) {
                const profileData = userSnap.data();
                const plan = profileData?.currentPlan;
                if ((plan === 'pro' || plan === 'ultra') &&
                    profileData?.subscriptionStatus !== 'expired') {
                    userPlan = plan;
                }
            }
            const limit = generateAdHandler_1.PLAN_DAILY_LIMITS[userPlan];
            // Read usage record for today (Asia/Tashkent date)
            const usageSnap = await transaction.get(usageDocRef);
            const currentCount = usageSnap.exists ? usageSnap.data()?.adCount || 0 : 0;
            // Quota check
            if (currentCount >= limit) {
                throw new https_1.HttpsError('resource-exhausted', `Bugun uchun belgilangan kunlik ${limit} ta reklama limiti to'ldi (${userPlan.toUpperCase()} tarifi). Yangi kvota ertaga Toshkent vaqti bilan 00:00 da beriladi.`, {
                    currentCount,
                    dailyLimit: limit,
                    remaining: 0,
                    plan: userPlan,
                    date: dateKey,
                });
            }
            // Increment usage
            const newCount = currentCount + 1;
            const nowIso = new Date().toISOString();
            if (usageSnap.exists) {
                transaction.update(usageDocRef, {
                    adCount: newCount,
                    lastGeneratedAt: nowIso,
                });
            }
            else {
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
        const adText = (0, generateAdHandler_1.generateAdText)(formData);
        return {
            success: true,
            adText,
            ...quotaResult,
        };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        console.error('Error generating ad in Cloud Function:', error);
        throw new https_1.HttpsError('internal', error?.message || 'Serverda xatolik yuz berdi.');
    }
});
//# sourceMappingURL=index.js.map