/**
 * BiznesYordam - Click Shop API Service
 * Handles Click Payment integration (Prepare & Complete callbacks),
 * MD5 signature calculation & verification, plan price enforcement,
 * and authoritative atomic Firestore subscription provisioning.
 */

import crypto from 'crypto';
import { adminDb } from './firebaseAdmin.js';

export type PaidPlanType = 'pro' | 'ultra';

/**
 * Strict server-side single source of truth for plan prices and entitlements.
 * Client-submitted amounts are NEVER trusted.
 */
export const PLAN_PRICES: Record<PaidPlanType, { amount: number; name: string; durationDays: number }> = {
  pro: {
    amount: 79000,
    name: 'Pro',
    durationDays: 30,
  },
  ultra: {
    amount: 189000,
    name: 'Ultra',
    durationDays: 30,
  },
};

/**
 * Official Click Shop-API Error Codes
 */
export const CLICK_ERRORS = {
  SUCCESS: 0,
  SIGN_CHECK_FAILED: -1,
  INCORRECT_AMOUNT: -2,
  ACTION_NOT_FOUND: -3,
  ALREADY_PAID: -4,
  USER_NOT_FOUND: -5,
  TRANSACTION_NOT_FOUND: -6,
  FAILED_TO_UPDATE: -7,
  REQUEST_ERROR: -8,
  TRANSACTION_CANCELLED: -9,
} as const;

export interface ClickPrepareRequestBody {
  click_trans_id?: string | number;
  service_id?: string | number;
  click_paydoc_id?: string | number;
  merchant_trans_id?: string;
  amount?: string | number;
  action?: string | number;
  error?: string | number;
  error_note?: string;
  sign_time?: string;
  sign_string?: string;
}

export interface ClickCompleteRequestBody {
  click_trans_id?: string | number;
  service_id?: string | number;
  click_paydoc_id?: string | number;
  merchant_trans_id?: string;
  merchant_prepare_id?: string | number;
  amount?: string | number;
  action?: string | number;
  error?: string | number;
  error_note?: string;
  sign_time?: string;
  sign_string?: string;
}

export interface ClickResponse {
  click_trans_id?: string | number;
  merchant_trans_id?: string;
  merchant_prepare_id?: string | number;
  merchant_confirm_id?: string | number;
  error: number;
  error_note: string;
}

export interface OrderRecord {
  id: string;
  userId: string;
  userEmail: string | null;
  plan: PaidPlanType;
  amount: number;
  currency: 'UZS';
  status: 'pending' | 'prepared' | 'paid' | 'cancelled' | 'failed';
  provider: 'click';
  clickTransId?: string | number | null;
  clickPaydocId?: string | number | null;
  merchantPrepareId?: string | number | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

/**
 * Calculates MD5 hash for strings.
 */
export function calculateMd5(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex');
}

/**
 * Generates MD5 signature for Click Prepare (action = 0)
 * Format: MD5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)
 */
export function generatePrepareSignature(
  clickTransId: string | number,
  serviceId: string | number,
  secretKey: string,
  merchantTransId: string,
  amount: string | number,
  action: string | number,
  signTime: string
): string {
  const raw = `${clickTransId}${serviceId}${secretKey}${merchantTransId}${amount}${action}${signTime}`;
  return calculateMd5(raw);
}

/**
 * Generates MD5 signature for Click Complete (action = 1)
 * Format: MD5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)
 */
export function generateCompleteSignature(
  clickTransId: string | number,
  serviceId: string | number,
  secretKey: string,
  merchantTransId: string,
  merchantPrepareId: string | number,
  amount: string | number,
  action: string | number,
  signTime: string
): string {
  const raw = `${clickTransId}${serviceId}${secretKey}${merchantTransId}${merchantPrepareId}${amount}${action}${signTime}`;
  return calculateMd5(raw);
}

/**
 * Generates official Click payment redirection URL.
 * Official Click Shop format:
 * https://my.click.uz/services/pay?service_id=...&merchant_id=...&amount=...&transaction_param=...&return_url=...
 */
export function generateClickPaymentUrl(
  orderId: string,
  amount: number,
  customReturnUrl?: string
): string {
  const serviceId = (process.env.CLICK_SERVICE_ID || '').trim();
  const merchantId = (process.env.CLICK_MERCHANT_ID || '').trim();
  const merchantUserId = (process.env.CLICK_MERCHANT_USER_ID || '').trim();
  const returnUrl = customReturnUrl || process.env.APP_FRONTEND_URL || '';

  const baseUrl = 'https://my.click.uz/services/pay';
  const params = new URLSearchParams();

  if (serviceId) params.append('service_id', serviceId);
  if (merchantId) params.append('merchant_id', merchantId);
  if (merchantUserId) params.append('merchant_user_id', merchantUserId);
  params.append('amount', amount.toString());
  params.append('transaction_param', orderId);
  if (returnUrl) {
    params.append('return_url', returnUrl);
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Creates an authoritative pending order in Firestore.
 * Requires authenticated user. Amount is strictly set according to plan.
 */
export async function createOrder(
  userId: string,
  userEmail: string | null,
  plan: PaidPlanType,
  customReturnUrl?: string
): Promise<{ orderId: string; amount: number; plan: PaidPlanType; paymentUrl: string }> {
  if (!PLAN_PRICES[plan]) {
    throw new Error(`Noto'g'ri tarif tanlandi: ${plan}. Faqat 'pro' yoki 'ultra' mavjud.`);
  }

  const serviceId = (process.env.CLICK_SERVICE_ID || '').trim();
  const merchantId = (process.env.CLICK_MERCHANT_ID || '').trim();
  const secretKey = (process.env.CLICK_SECRET_KEY || '').trim();

  if (!serviceId || !merchantId || !secretKey) {
    throw new Error(
      "Click to'lov tizimi serverda hali sozlanmagan (CLICK_SERVICE_ID, CLICK_MERCHANT_ID, CLICK_SECRET_KEY talab etiladi)."
    );
  }

  const planConfig = PLAN_PRICES[plan];
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const nowIso = new Date().toISOString();

  const orderRecord: OrderRecord = {
    id: orderId,
    userId,
    userEmail: userEmail || null,
    plan,
    amount: planConfig.amount,
    currency: 'UZS',
    status: 'pending',
    provider: 'click',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // Save order to Firestore named database
  await adminDb.collection('orders').doc(orderId).set(orderRecord);

  const paymentUrl = generateClickPaymentUrl(orderId, planConfig.amount, customReturnUrl);

  return {
    orderId,
    amount: planConfig.amount,
    plan,
    paymentUrl,
  };
}

/**
 * Handles Click Shop API "Prepare" callback (action = 0).
 * Verifies signature, service_id, order existence, status, and exact amount.
 */
export async function handleClickPrepare(body: ClickPrepareRequestBody): Promise<ClickResponse> {
  const clickTransId = body.click_trans_id ?? '';
  const merchantTransId = (body.merchant_trans_id || '').trim();
  const serviceId = body.service_id ?? '';
  const amount = body.amount ?? '';
  const action = body.action;
  const signTime = body.sign_time || '';
  const signString = (body.sign_string || '').trim();

  const secretKey = (process.env.CLICK_SECRET_KEY || '').trim();

  // 1. Check server configuration
  if (!secretKey) {
    console.error('[Click Prepare] Server configuration error: CLICK_SECRET_KEY is not defined in environment.');
    return {
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      error: CLICK_ERRORS.REQUEST_ERROR,
      error_note: 'Server konfiguratsiyasida xatolik yuz berdi (CLICK_SECRET_KEY yo\'q)',
    };
  }

  // 2. Validate action code (0 = Prepare)
  if (String(action) !== '0') {
    return {
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      error: CLICK_ERRORS.ACTION_NOT_FOUND,
      error_note: 'Noto\'g\'ri harakat kodi (action 0 bo\'lishi shart)',
    };
  }

  // 3. Verify MD5 Signature
  const expectedSign = generatePrepareSignature(
    clickTransId,
    serviceId,
    secretKey,
    merchantTransId,
    amount,
    (action ?? '').toString(),
    signTime
  );

  if (!signString || signString.toLowerCase() !== expectedSign.toLowerCase()) {
    console.warn('[Click Prepare] Signature mismatch.');
    return {
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      error: CLICK_ERRORS.SIGN_CHECK_FAILED,
      error_note: 'SIGN CHECK FAILED',
    };
  }

  // 4. Verify order in Firestore
  if (!merchantTransId) {
    return {
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      error: CLICK_ERRORS.USER_NOT_FOUND,
      error_note: 'merchant_trans_id (buyurtma ID) ko\'rsatilmagan',
    };
  }

  const orderRef = adminDb.collection('orders').doc(merchantTransId);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    return {
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      error: CLICK_ERRORS.USER_NOT_FOUND,
      error_note: 'Buyurtma topilmadi',
    };
  }

  const orderData = orderSnap.data() as OrderRecord;

  // 5. Strict Amount Verification
  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || Math.abs(numericAmount - orderData.amount) > 0.01) {
    console.warn(`[Click Prepare] Amount mismatch for order ${merchantTransId}. Expected ${orderData.amount}, received ${numericAmount}`);
    return {
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      error: CLICK_ERRORS.INCORRECT_AMOUNT,
      error_note: 'Buyurtma summasi mos kelmaydi',
    };
  }

  // 6. Check Order Status
  if (orderData.status === 'paid') {
    return {
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      error: CLICK_ERRORS.ALREADY_PAID,
      error_note: 'Buyurtma allaqachon to\'langan',
    };
  }

  if (orderData.status === 'cancelled' || orderData.status === 'failed') {
    return {
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      error: CLICK_ERRORS.TRANSACTION_CANCELLED,
      error_note: 'Buyurtma bekor qilingan',
    };
  }

  // 7. Update Order with Click metadata and status 'prepared'
  const nowIso = new Date().toISOString();
  await orderRef.update({
    status: 'prepared',
    clickTransId,
    clickPaydocId: body.click_paydoc_id ?? null,
    merchantPrepareId: merchantTransId,
    updatedAt: nowIso,
  });

  return {
    click_trans_id: clickTransId,
    merchant_trans_id: merchantTransId,
    merchant_prepare_id: merchantTransId,
    error: CLICK_ERRORS.SUCCESS,
    error_note: 'Success',
  };
}

/**
 * Handles Click Shop API "Complete" callback (action = 1).
 * Verifies signature, amount, and idempotently provisions subscription in an atomic transaction.
 */
export async function handleClickComplete(body: ClickCompleteRequestBody): Promise<ClickResponse> {
  const clickTransId = body.click_trans_id ?? '';
  const merchantTransId = (body.merchant_trans_id || '').trim();
  const merchantPrepareId = body.merchant_prepare_id ?? merchantTransId;
  const serviceId = body.service_id ?? '';
  const amount = body.amount ?? '';
  const action = body.action;
  const signTime = body.sign_time || '';
  const signString = (body.sign_string || '').trim();
  const clickError = Number(body.error ?? 0);

  const secretKey = (process.env.CLICK_SECRET_KEY || '').trim();

  // 1. Check server configuration
  if (!secretKey) {
    console.error('[Click Complete] Server configuration error: CLICK_SECRET_KEY is not defined in environment.');
    return {
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      error: CLICK_ERRORS.REQUEST_ERROR,
      error_note: 'Server konfiguratsiyasida xatolik yuz berdi (CLICK_SECRET_KEY yo\'q)',
    };
  }

  // 2. Validate action code (1 = Complete)
  if (String(action) !== '1') {
    return {
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      error: CLICK_ERRORS.ACTION_NOT_FOUND,
      error_note: 'Noto\'g\'ri harakat kodi (action 1 bo\'lishi shart)',
    };
  }

  // 3. Verify MD5 Signature
  const expectedSign = generateCompleteSignature(
    clickTransId,
    serviceId,
    secretKey,
    merchantTransId,
    merchantPrepareId,
    amount,
    (action ?? '').toString(),
    signTime
  );

  if (!signString || signString.toLowerCase() !== expectedSign.toLowerCase()) {
    console.warn('[Click Complete] Signature mismatch.');
    return {
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      error: CLICK_ERRORS.SIGN_CHECK_FAILED,
      error_note: 'SIGN CHECK FAILED',
    };
  }

  // 4. Verify merchant_trans_id existence
  if (!merchantTransId) {
    return {
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      error: CLICK_ERRORS.USER_NOT_FOUND,
      error_note: 'merchant_trans_id topilmadi',
    };
  }

  const orderRef = adminDb.collection('orders').doc(merchantTransId);

  // 5. Handle provider cancellation (Click sent error < 0)
  if (clickError < 0) {
    console.warn(`[Click Complete] Transaction cancelled by Click. Code: ${clickError}, note: ${body.error_note}`);
    try {
      await orderRef.update({
        status: 'cancelled',
        clickError,
        clickErrorNote: body.error_note || 'Cancelled by Click',
        updatedAt: new Date().toISOString(),
      });
    } catch (updateErr) {
      console.error('Failed to update cancelled order status:', updateErr);
    }

    return {
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      error: CLICK_ERRORS.TRANSACTION_CANCELLED,
      error_note: 'Transaction cancelled by provider',
    };
  }

  // 6. Authoritative Atomic Transaction for idempotency & subscription provisioning
  try {
    const transactionResult = await adminDb.runTransaction(async (transaction) => {
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists) {
        return {
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          error: CLICK_ERRORS.USER_NOT_FOUND,
          error_note: 'Buyurtma topilmadi',
        };
      }

      const orderData = orderSnap.data() as OrderRecord;

      // Amount verification
      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || Math.abs(numericAmount - orderData.amount) > 0.01) {
        return {
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          error: CLICK_ERRORS.INCORRECT_AMOUNT,
          error_note: 'Buyurtma summasi mos kelmaydi',
        };
      }

      // IDEMPOTENCY: If this transaction was already processed and paid, return success immediately
      // without re-incrementing subscription or repeating plan provisioning.
      if (orderData.status === 'paid') {
        console.log(`[Click Complete] Order ${merchantTransId} already marked paid. Acknowledging idempotently.`);
        return {
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          merchant_confirm_id: merchantTransId,
          error: CLICK_ERRORS.SUCCESS,
          error_note: 'Success (already processed)',
        };
      }

      if (orderData.status !== 'pending' && orderData.status !== 'prepared') {
        return {
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          error: CLICK_ERRORS.TRANSACTION_CANCELLED,
          error_note: 'Buyurtma holati to\'lov uchun yaroqsiz',
        };
      }

      // Read user document to update plan & subscription expiration
      const userRef = adminDb.collection('users').doc(orderData.userId);
      const userSnap = await transaction.get(userRef);

      const now = new Date();
      const planDays = PLAN_PRICES[orderData.plan]?.durationDays || 30;
      const durationMs = planDays * 24 * 60 * 60 * 1000;

      let baseDate = now;
      if (userSnap.exists) {
        const userData = userSnap.data();
        if (userData?.planExpiresAt && userData?.currentPlan === orderData.plan) {
          const currentExpiry = new Date(userData.planExpiresAt);
          if (!isNaN(currentExpiry.getTime()) && currentExpiry > now) {
            // User had active days remaining on the same plan - extend from existing expiration
            baseDate = currentExpiry;
          }
        }
      }

      const newExpiryDate = new Date(baseDate.getTime() + durationMs);
      const newExpiryIso = newExpiryDate.toISOString();
      const nowIso = now.toISOString();

      // Update Order Status to 'paid'
      transaction.update(orderRef, {
        status: 'paid',
        clickTransId,
        clickPaydocId: body.click_paydoc_id ?? null,
        merchantPrepareId,
        merchantConfirmId: merchantTransId,
        completedAt: nowIso,
        updatedAt: nowIso,
      });

      // Authoritatively provision user's plan and subscription status
      if (userSnap.exists) {
        transaction.update(userRef, {
          currentPlan: orderData.plan,
          subscriptionStatus: 'active',
          planExpiresAt: newExpiryIso,
          updatedAt: nowIso,
        });
      } else {
        transaction.set(userRef, {
          uid: orderData.userId,
          email: orderData.userEmail || null,
          currentPlan: orderData.plan,
          subscriptionStatus: 'active',
          planExpiresAt: newExpiryIso,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }

      console.log(`[Click Complete] Successfully upgraded user ${orderData.userId} to ${orderData.plan.toUpperCase()} until ${newExpiryIso}`);

      return {
        click_trans_id: clickTransId,
        merchant_trans_id: merchantTransId,
        merchant_confirm_id: merchantTransId,
        error: CLICK_ERRORS.SUCCESS,
        error_note: 'Success',
      };
    });

    return transactionResult;
  } catch (txError: any) {
    console.error('[Click Complete] Firestore transaction error:', txError);
    return {
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      error: CLICK_ERRORS.FAILED_TO_UPDATE,
      error_note: 'Tranzaksiyani saqlashda xatolik yuz berdi',
    };
  }
}

/**
 * Handles Click Shop API "Cancel" callback (action = 2).
 * Verifies signature, amount, and idempotently cancels order in Firestore.
 */
export async function handleClickCancel(body: ClickCompleteRequestBody): Promise<ClickResponse> {
  const clickTransId = body.click_trans_id ?? '';
  const merchantTransId = (body.merchant_trans_id || '').trim();
  const merchantPrepareId = body.merchant_prepare_id ?? merchantTransId;
  const serviceId = body.service_id ?? '';
  const amount = body.amount ?? '';
  const action = body.action;
  const signTime = body.sign_time || '';
  const signString = (body.sign_string || '').trim();

  const secretKey = (process.env.CLICK_SECRET_KEY || '').trim();

  if (!secretKey) {
    console.error('[Click Cancel] Server configuration error: CLICK_SECRET_KEY is not defined.');
    return {
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      error: CLICK_ERRORS.REQUEST_ERROR,
      error_note: 'Server konfiguratsiyasida xatolik',
    };
  }

  // 1. Verify action code (2 = Cancel)
  if (String(action) !== '2') {
    return {
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      error: CLICK_ERRORS.ACTION_NOT_FOUND,
      error_note: 'Noto\'g\'ri harakat kodi (action 2 bo\'lishi shart)',
    };
  }

  // 2. Verify Signature (uses same format as Complete action=1)
  const expectedSign = generateCompleteSignature(
    clickTransId,
    serviceId,
    secretKey,
    merchantTransId,
    merchantPrepareId,
    amount,
    (action ?? '').toString(),
    signTime
  );

  if (!signString || signString.toLowerCase() !== expectedSign.toLowerCase()) {
    console.warn('[Click Cancel] Signature mismatch.');
    return {
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      error: CLICK_ERRORS.SIGN_CHECK_FAILED,
      error_note: 'SIGN CHECK FAILED',
    };
  }

  const orderRef = adminDb.collection('orders').doc(merchantTransId);

  // 3. Atomic Idempotent Cancellation
  try {
    return await adminDb.runTransaction(async (transaction) => {
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists) {
        return {
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          error: CLICK_ERRORS.USER_NOT_FOUND,
          error_note: 'Buyurtma topilmadi',
        };
      }

      const orderData = orderSnap.data() as OrderRecord;

      // Idempotency: Already cancelled
      if (orderData.status === 'cancelled') {
        return {
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          error: CLICK_ERRORS.SUCCESS,
          error_note: 'Success (already cancelled)',
        };
      }

      // Can't cancel paid orders
      if (orderData.status === 'paid') {
        return {
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          error: CLICK_ERRORS.TRANSACTION_CANCELLED,
          error_note: 'To\'langan buyurtmani bekor qilib bo\'lmaydi',
        };
      }

      transaction.update(orderRef, {
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      });

      return {
        click_trans_id: clickTransId,
        merchant_trans_id: merchantTransId,
        error: CLICK_ERRORS.SUCCESS,
        error_note: 'Success',
      };
    });
  } catch (txError) {
    console.error('[Click Cancel] Firestore transaction error:', txError);
    return {
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      error: CLICK_ERRORS.FAILED_TO_UPDATE,
      error_note: 'Tranzaksiyani bekor qilishda xatolik',
    };
  }
}
