/**
 * BiznesYordam - Click Payment Service
 * Handles interaction with the secure backend payment order endpoint.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:10000';

export async function initiateClickPayment(
  plan: 'pro' | 'ultra',
  token: string
): Promise<{ paymentUrl: string; orderId: string }> {
  const response = await fetch(`${BACKEND_URL}/api/payment/click/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ plan }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'To\'lov buyurtmasini yaratishda xatolik yuz berdi.');
  }

  if (!data.paymentUrl || typeof data.paymentUrl !== 'string' || !data.orderId) {
    throw new Error('To\'lov tizimidan noto\'g\'ri javob olindi.');
  }

  return { paymentUrl: data.paymentUrl, orderId: data.orderId };
}
